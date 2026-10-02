/**
 * Notificaciones de sync caído.
 *
 * Decisión de canal: un **webhook HTTP genérico** con transporte intercambiable,
 * no una integración con un proveedor concreto. Motivo: la misma llamada sirve
 * para ntfy (push al móvil, sin cuenta ni API key), Slack o Discord cambiando la
 * URL, así que atarse a uno sería trabajo que se tira cuando cambie.
 *
 * Dos reglas que un alerting mal hecho suele violar:
 *
 * 1 · **Un fallo de la alerta no puede tumbar el sync.** `notify()` nunca lanza.
 *    Si el canal está caído, eso se pierde; si el sync también se cae por eso,
 *    se pierde el corpus entero. El peor error de observabilidad es el que
 *    rompe lo que observa.
 *
 * 2 · **Dispara por cambio de estado, no por corrida.** El cron corre cada día:
 *    avisar en cada fallo sería spam que el usuario silencia, y a partir de ahí
 *    la alerta vale cero. Solo se notifica al *entrar* en un estado degradado, y
 *    se re-escucha si la última nota fue hace más de `repeatAfterHours`.
 *
 * El estado se guarda en `sync_runs` como fila de auditoría, no en memoria: el
 * proceso de Vercel es efímero y un `Map` forgotten cada invocación.
 */

export type AlertSeverity = 'warning' | 'error';

export type AlertPayload = {
  readonly title: string;
  readonly message: string;
  readonly severity: AlertSeverity;
  /** Campos extra para el cuerpo del mensaje, en formato `clave: valor`. */
  readonly facts?: Readonly<Record<string, string | number | null>>;
};

export type NotifyResult = 'sent' | 'not_configured' | 'deduped' | 'failed';

/** Marcador de "ya avisado de este estado" que se persiste como fila de sync. */
const LAST_ALERT_PREFIX = 'alert:';

export function lastAlertMarker(key: string): string {
  return `${LAST_ALERT_PREFIX}${key}`;
}

/**
 * Timeout por defecto del POST. Suficiente para un push notification y lo
 * bastante corto para no comerse el `maxDuration` del cron.
 */
export const ALERT_TIMEOUT_MS = 5_000;

/**
 * Envía la alerta. Nunca lanza: devuelve el resultado para que el llamante lo
 * registre sin decidir el fate del sync.
 *
 * `timeoutMs` es inyectable porque un timeout de 5 s no es testeable: el test
 * tardaría 5 s en resolver, justo el `testTimeout` por defecto de Vitest.
 */
export async function notify(
  payload: AlertPayload,
  options: { timeoutMs?: number } = {},
): Promise<NotifyResult> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (url === undefined || url === '') return 'not_configured';

  // Sin esto, un endpoint caído hace que el cron tarde más de `maxDuration` y
  // Vercel lo mate a mitad — convirtiendo un aviso fallido en un sync interrumpido.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? ALERT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.ALERT_WEBHOOK_TOKEN !== undefined &&
        process.env.ALERT_WEBHOOK_TOKEN !== ''
          ? { authorization: `Bearer ${process.env.ALERT_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        topic: payload.severity,
        title: payload.title,
        message: renderMessage(payload),
        priority: payload.severity === 'error' ? 5 : 4,
      }),
      signal: controller.signal,
    });
    return response.ok ? 'sent' : 'failed';
  } catch {
    // Canal caído, DNS mal, timeout, abort. Se traga a propósito.
    return 'failed';
  } finally {
    clearTimeout(timeout);
  }
}

function renderMessage(payload: AlertPayload): string {
  const facts = Object.entries(payload.facts ?? {})
    .map(([key, value]) => `${key}: ${value ?? '—'}`)
    .join('\n');
  return facts === '' ? payload.message : `${payload.message}\n${facts}`;
}

/**
 * ¿Toca avisar? Se dispara al entrar en el estado y luego cada
 * `repeatAfterHours`, para que un problema de días no se reporte una sola vez y
 * se pierda en el historial.
 */
export function shouldNotify(input: {
  readonly lastNotifiedAt: Date | null;
  readonly now: Date;
  readonly repeatAfterHours: number;
}): boolean {
  if (input.lastNotifiedAt === null) return true;

  const elapsedHours = (input.now.getTime() - input.lastNotifiedAt.getTime()) / 3_600_000;
  // Un `lastNotifiedAt` en el futuro (reloj desincronizado) se trata como
  // "nunca avisado": repetir la alerta es preferible a tragársela.
  if (elapsedHours < 0) return true;
  return elapsedHours >= input.repeatAfterHours;
}

/** Mensajes en ES/EN según el estado. El texto viaja en el payload, no aquí. */
export function syncFailureAlert(
  runs: ReadonlyArray<{ sourceId: string; outcome: string; detail: string | null }>,
  locale: 'es' | 'en',
): AlertPayload | null {
  const failed = runs.filter((run) => run.outcome === 'failed');
  if (failed.length === 0) return null;

  const names = failed.map((run) => run.sourceId).join(', ');

  return {
    title:
      locale === 'es'
        ? `Sync caído: ${failed.length} fuente${failed.length === 1 ? '' : 's'}`
        : `Sync failed: ${failed.length} source${failed.length === 1 ? '' : 's'}`,
    message:
      locale === 'es'
        ? 'El pipeline de sincronización falló. Los estados pueden no reflejar la información actual.'
        : 'The sync pipeline failed. Statuses may not reflect current information.',
    severity: 'error',
    facts: {
      fuentes: names,
      detalle: failed[0]?.detail ?? null,
      fallo_desde: failed[0]?.sourceId ?? null,
    },
  };
}

export function stalenessAlert(
  ageHours: number | null,
  locale: 'es' | 'en',
): AlertPayload | null {
  if (ageHours === null) return null;

  const critical = ageHours >= 72;

  return {
    title:
      locale === 'es'
        ? `Datos sin verificar: ~${ageHours} h`
        : `Unverified data: ~${ageHours} h`,
    message:
      locale === 'es'
        ? critical
          ? 'El corpus lleva más de 3 días sin verificarse. El sitio muestra un aviso a los usuarios.'
          : 'El corpus lleva más de 24 h sin verificarse.'
        : critical
          ? 'The corpus has not been verified in over 3 days. The site shows users a warning.'
          : 'The corpus has not been verified in over 24 h.',
    severity: critical ? 'error' : 'warning',
  };
}
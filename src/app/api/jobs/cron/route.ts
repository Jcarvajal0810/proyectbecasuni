import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/jobs/cron-auth';
import { syncAll } from '@/jobs/sync';
import { getCorpusStats } from '@/db/queries';
import { dataHealth } from '@/core/deadline/freshness';
import {
  lastAlertMarker,
  notify,
  shouldNotify,
  stalenessAlert,
  syncFailureAlert,
  type AlertPayload,
} from '@/observability/notify';
import { getDb } from '@/db/client';

/** Re-avisar tras 24 h sin resolver: diario, como el cron. */
const REPEAT_AFTER_HOURS = 24;

/**
 * Cron de sync para Vercel.
 *
 * Ruta **separada** de `/api/jobs/sync` a propósito: el cron de Vercel solo
 * puede enviar `Authorization: Bearer $CRON_SECRET` y no sabe firmar un HMAC.
 * Haber metido el cron sobre el endpoint firmado habría producido un 401 en cada
 * corrida y un health check verde mientras el corpus envejecía en silencio.
 *
 * El guard de replay de la ruta firmada no aplica aquí: no hay ventana de firma
 * que reabrir. El costo de una invocación repetida es un upsert idempotente.
 */
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const auth = verifyCronSecret(request.headers.get('authorization'));
  if (!auth.ok) {
    return Response.json(
      {
        error: auth.status === 503 ? 'not_configured' : 'unauthorized',
        message:
          auth.status === 503
            ? 'CRON_SECRET no está configurado.'
            : 'Credencial de cron inválida.',
      },
      { status: auth.status },
    );
  }

  try {
    const runs = await syncAll();

    // Un run fallido es un 200 con detalle: la ruta funcionó, la fuente no. Un
    // 503 aquí haría que Vercel reintentara y golpearía el circuit breaker de la
    // fuente por un fallo que ya está registrado.
    const failed = runs.filter((r) => r.outcome === 'failed');

    const health = dataHealth(await getCorpusStats());
    const alerts: Record<string, string> = {};
    for (const [name, payload] of Object.entries({
      sync: syncFailureAlert(runs, 'es'),
      staleness: stalenessAlert(health.ageHours, 'es'),
    })) {
      const result = await dispatch(name, payload);
      if (result !== null) alerts[name] = result;
    }

    return NextResponse.json(
      { runs, failed: failed.length, freshness: health.state, alerts },
      { status: 200, headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return Response.json({ error: 'sync_failed' }, { status: 500 });
  }
}

/**
 * Envía la alerta solo si toca, y registra cuándo avisó para que la próxima
 * corrida no repita.
 *
 ** Cualquier excepción se traga: una alerta que rompe el cron convertiría un aviso
 * fallido en un sync que sí se pierde.
 */
async function dispatch(name: string, payload: AlertPayload | null): Promise<string | null> {
  if (payload === null) return null;

  const key = lastAlertMarker(name);

  try {
    const db = getDb();
    const rows = await db<{ last_sent_at: Date }[]>`
      SELECT last_sent_at FROM alert_state WHERE key = ${key}
    `;
    const last = rows[0]?.last_sent_at ?? null;

    if (
      !shouldNotify({ lastNotifiedAt: last, now: new Date(), repeatAfterHours: REPEAT_AFTER_HOURS })
    ) {
      return 'deduped';
    }

    const result = await notify(payload);

    // Se registra el intento incluso si falló: si el canal estuvo caído una hora,
    // reintentar en la próxima corrida (12 h después) tiene más sentido que
    // martillear el webhook cada día sin parar.
    await db`
      INSERT INTO alert_state (key, last_sent_at, last_result)
      VALUES (${key}, now(), ${result})
      ON CONFLICT (key) DO UPDATE
        SET last_sent_at = now(), last_result = EXCLUDED.last_result
    `;

    return result;
  } catch {
    return 'failed';
  }
}
/**
 * Frescura de los datos (data-strategy §4.5).
 *
 * El riesgo que cubre: un sync caído hace días y el sitio sigue publicando
 * "última verificación: hace 9 días" como si fuera normal. Nada en la UI señala
 * que el proceso se detuvo, así que el usuario no tiene forma de saberlo. Este
 * módulo convierte ese silencio en un número verificable desde fuera.
 *
 * No decide *a quién* avisar: solo produce el estado. El canal (Sentry, email,
 * Slack) es una decisión de despliegue aparte, y esta lógica no depende de él.
 */

export type FreshnessState = 'fresh' | 'stale' | 'critical' | 'unknown';

export type FreshnessInput = {
  /** ISO de la verificación más reciente del corpus, o `null` si nunca corrió. */
  readonly lastVerifiedAt: string | null;
  readonly now: Date;
};

/**
 * Umbrales. `stale` es el punto en el que la respuesta ya no es confiable para
 * decidir una postulación; `critical` es donde el sitio ya está mintiendo con
 * la fecha de verificación.
 */
export const STALE_AFTER_HOURS = 24;
export const CRITICAL_AFTER_HOURS = 72;

export function freshnessState(input: FreshnessInput): FreshnessState {
  if (input.lastVerifiedAt === null) return 'unknown';

  const last = Date.parse(input.lastVerifiedAt);
  if (Number.isNaN(last)) return 'unknown';

  const ageHours = (input.now.getTime() - last) / 3_600_000;

  // Un timestamp futuro significa reloj desincronizado o datos manipulados. En
  // ambos casos la edad negativa no significa "fresco": no sabemos nada.
  if (ageHours < 0) return 'unknown';

  if (ageHours >= CRITICAL_AFTER_HOURS) return 'critical';
  if (ageHours >= STALE_AFTER_HOURS) return 'stale';
  return 'fresh';
}

/** Horas redondeadas hacia arriba, para el log y para el health check. */
export function ageHours(lastVerifiedAt: string | null, now: Date): number | null {
  if (lastVerifiedAt === null) return null;
  const last = Date.parse(lastVerifiedAt);
  if (Number.isNaN(last)) return null;
  return Math.max(0, Math.ceil((now.getTime() - last) / 3_600_000));
}

export type DataHealth = {
  readonly state: FreshnessState;
  readonly lastVerifiedAt: string | null;
  readonly ageHours: number | null;
  readonly published: number;
  readonly staleAfterHours: number;
  readonly criticalAfterHours: number;
};

export function dataHealth(
  stats: {
    readonly published: number;
    readonly lastVerifiedAt: string | null;
  },
  now: Date = new Date(),
): DataHealth {
  return {
    state: freshnessState({ lastVerifiedAt: stats.lastVerifiedAt, now }),
    lastVerifiedAt: stats.lastVerifiedAt,
    ageHours: ageHours(stats.lastVerifiedAt, now),
    published: stats.published,
    staleAfterHours: STALE_AFTER_HOURS,
    criticalAfterHours: CRITICAL_AFTER_HOURS,
  };
}

/**
 * Degradado cuando el corpus está en estado `critical`, o cuando no hay ninguna
 * verificación posible (`unknown`): o nunca corrió el sync, o el timestamp es
 * ilegible, o el reloj del servidor va por detrás. Sin evidencia de frescura no
 * se puede dar el despliegue por bueno.
 *
 * Un corpus vacío con datos "verificados" hace 1 h también es degradado: no hay
 * nada que verificar, así que el `fresh` no describe nada real. Cubre el
 * despliegue donde el seed no llegó a correr.
 */
export function healthDegraded(health: DataHealth): boolean {
  if (health.state === 'critical' || health.state === 'unknown') return true;
  // Con cero registros publicados el `fresh` no describe nada: o el seed no
  // corrió, o el sync no ha escrito nada, o la vista está filtrando todo.
  return health.published === 0;
}
import { type DeadlineBasis, type DeadlinePrecision } from '../status/types';

/**
 * Reglas de countdown (data-strategy §4.2). Seis condiciones; si falla una,
 * el resultado es `null` — nunca `0`. Un `0` sobre un deadline vivo es
 * exactamente el bug que `value-impact §3` (U1) reporta como motivo de abandono.
 */
export type CountdownInput = {
  readonly status: string;
  readonly deadlineAt: Date | null;
  readonly deadlineBasis: DeadlineBasis;
  readonly deadlinePrecision: DeadlinePrecision;
  readonly deadlineTz: string | null;
  readonly now: Date;
  readonly isPublished: boolean;
  readonly isDemo: boolean;
  readonly deletedAt: Date | null;
};

export type Countdown = {
  readonly days: number | null;
  readonly hours: number | null;
  /** Texto ya resuelto en la zona del lector, solo para `deadline_at`. */
  readonly deadlineLocal: string | null;
};

export const COUNTDOWN_DENIED: Countdown = {
  days: null,
  hours: null,
  deadlineLocal: null,
};

/**
 * Calcula días u horas restantes **en la zona donde vive la convocatoria**,
 * nunca en la zona del lector. La zona del lector se usa solo para mostrar la
 * hora local equivalente (data-strategy §4.3).
 */
export function computeCountdown(input: CountdownInput): Countdown {
  if (!input.isPublished) return COUNTDOWN_DENIED;
  if (input.isDemo) return COUNTDOWN_DENIED;
  if (input.deletedAt !== null) return COUNTDOWN_DENIED;

  if (input.status !== 'OPEN' && input.status !== 'UPCOMING') return COUNTDOWN_DENIED;
  if (input.deadlineAt === null) return COUNTDOWN_DENIED;
  if (input.deadlineBasis !== 'publisher_stated') return COUNTDOWN_DENIED;
  if (input.deadlinePrecision === 'UNKNOWN') return COUNTDOWN_DENIED;
  if (input.deadlineTz === null) return COUNTDOWN_DENIED;
  if (input.deadlineAt <= input.now) return COUNTDOWN_DENIED;

  let tz: string;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: input.deadlineTz });
    tz = input.deadlineTz;
  } catch {
    return COUNTDOWN_DENIED;
  }

  // `timeZoneName` no se puede combinar con dateStyle/timeStyle: Intl lo rechaza.
  // La zona se muestra aparte en la capa de presentación.
  const deadlineLocal = new Intl.DateTimeFormat('es-ES', {
    timeZone: tz,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(input.deadlineAt);

  if (input.deadlinePrecision === 'MINUTE' || input.deadlinePrecision === 'HOUR') {
    const deltaMs = input.deadlineAt.getTime() - input.now.getTime();
    // Mismo mínimo que en días: con 30 minutos restantes, `Math.floor` daría
    // "0 horas". Un 0 sobre un deadline vivo es el mismo bug que R6 prohíbe.
    const hours = Math.max(1, Math.floor(deltaMs / 3_600_000));
    return { days: null, hours, deadlineLocal };
  }

  // DATE: días naturales hasta el FIN DEL DÍA del deadline en su propia zona.
  // El cutoff es una regla declarada (deadline_precision = DATE + deadline_tz),
  // no un supuesto invisible: por eso DS-05 lo permite.
  const dayInTz = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);

  const deadlineDay = dayInTz(input.deadlineAt);
  const today = dayInTz(input.now);
  const raw = daysBetween(today, deadlineDay);

  if (raw === null || raw < 0) return { days: null, hours: null, deadlineLocal };

  // Mínimo 1 día mientras el deadline siga en el futuro. Sin este mínimo,
  // un deadline HOY a las 23:59 con 12 h restantes devuelve 0: el "0 días" que
  // `value-impact §3` (U1) reporta como motivo de abandono, y que R6 prohíbe.
  const days = raw === 0 ? 1 : raw;

  return { days, hours: null, deadlineLocal };
}

function daysBetween(fromISO: string, toISO: string): number | null {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/**
 * Convierte `countdown_raw` de la vista pública en el `Countdown` de la UI.
 *
 * La vista entrega **segundos** para `MINUTE`/`HOUR` y **días naturales** para
 * `DATE`. Los componentes nunca deben reinterpretar ese número por su cuenta:
 * esa aritmética ya estuvo equivocada una vez (dividir segundos entre
 * `3_600_000`, que son milisegundos por hora, daba siempre "1 h"), y un countdown
 * que miente es peor que uno ausente.
 */
export function countdownFromView(
  raw: number | null,
  precision: DeadlinePrecision,
): { days: number | null; hours: number | null } {
  if (raw === null) return { days: null, hours: null };
  if (!Number.isFinite(raw)) return { days: null, hours: null };

  if (precision === 'DATE') return { days: Math.max(1, Math.floor(raw)), hours: null };
  if (precision === 'MINUTE' || precision === 'HOUR') {
    return { days: null, hours: Math.max(1, Math.floor(raw / 3_600)) };
  }
  // `UNKNOWN` y cualquier precisión inesperada: sin countdown en vez de un 0.
  return { days: null, hours: null };
}

/** Urgencia para el tono visual. No es el estado: es presión temporal. */
export type CountdownTone = 'urgent' | 'soon' | 'comfortable' | null;

export function countdownTone(countdown: Countdown): CountdownTone {
  if (countdown.days !== null) {
    if (countdown.days <= 3) return 'urgent';
    if (countdown.days <= 10) return 'soon';
    return 'comfortable';
  }
  if (countdown.hours !== null) {
    if (countdown.hours <= 48) return 'urgent';
    return 'soon';
  }
  return null;
}
import type { MessageKey } from '@/i18n/messages';
import { format } from '@/i18n/messages';

/**
 * Verbatim del deadline (ux-strategy §4).
 *
 * Regla dura del sistema visual: lo que el sistema afirma va en tinta fría
 * (`#F5F7FF`); lo que **cita** una fuente va en tinta cálida (`#B5AFA6`).
 * Confundir las dos es exactamente el error que hace sonar a la fuente a algo
 * que nunca dijo.
 */
export function DeadlineLine({
  deadlineAt,
  deadlineBasis,
  deadlineRawText,
  countdownDays,
  countdownHours,
  t,
  deadlineTz,
}: {
  deadlineAt: string | null;
  deadlineBasis: string;
  deadlineRawText: string | null;
  countdownDays: number | null;
  countdownHours: number | null;
  t: Record<MessageKey, string>;
  deadlineTz: string | null;
}) {
  const estimated = deadlineBasis === 'inferred_from_cycle';
  const declared = deadlineBasis === 'publisher_stated';

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="label text-[var(--text-faint)]">{t['field.deadline']}</span>

      {countdownDays !== null ? (
        <strong className="text-sm font-semibold text-[var(--text-primary)]">
          {format(t['countdown.days'], { n: countdownDays })}
        </strong>
      ) : countdownHours !== null ? (
        <strong className="text-sm font-semibold text-[var(--text-primary)]">
          {format(t['countdown.hours'], { n: countdownHours })}
        </strong>
      ) : null}

      {deadlineAt !== null ? (
        <time
          dateTime={deadlineAt}
          className="text-sm text-[var(--text-secondary)]"
          title={deadlineTz === null ? undefined : `(${deadlineTz})`}
        >
          {format(t['countdown.until'], { when: formatDate(deadlineAt, deadlineTz) })}
        </time>
      ) : (
        <span className="text-sm text-[var(--text-muted)]">{t['verified.none']}</span>
      )}

      {declared ? (
        <span className="text-xs text-[var(--state-open)]">✓ {t['verified.bySource']}</span>
      ) : null}
      {estimated ? (
        <span className="text-xs text-[var(--state-paused)]">≈ {t['verified.byUs']}</span>
      ) : null}

      {deadlineRawText !== null ? (
        <blockquote className="verbatim mt-1 w-full rounded-[8px] px-3 py-2">
          {deadlineRawText}
        </blockquote>
      ) : null}
    </div>
  );
}

function formatDate(iso: string, tz: string | null): string {
  try {
    // `timeZoneName` es incompatible con dateStyle/timeStyle en Intl.
    const base = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
    const formatted = base.format(new Date(iso));
    return tz === null ? formatted : `${formatted} (${tz})`;
  } catch {
    return iso;
  }
}

export function formatVerified(iso: string | null): string {
  if (iso === null) return '—';
  try {
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}
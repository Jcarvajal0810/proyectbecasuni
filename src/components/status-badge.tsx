import type { InternalStatus } from '@/core/status/types';
import type { MessageKey } from '@/i18n/messages';

/**
 * Estado con geometría distinta, no solo color (ux-strategy §5 / WCAG 1.4.1).
 *
 * `UNKNOWN` nunca comparte forma con `CLOSED`: el usuario con daltonismo o en
 * una pantalla gris debe poder distinguirlos sin leer el texto. Cada estado
 * lleva glifo + etiqueta.
 */

const STYLES: Record<
  InternalStatus,
  { color: string; glyph: string; label: MessageKey; ring: string }
> = {
  OPEN: {
    color: 'var(--state-open)',
    glyph: '●',
    label: 'status.OPEN',
    ring: 'border-l-[3px]',
  },
  UPCOMING: {
    color: 'var(--state-upcoming)',
    glyph: '○',
    label: 'status.UPCOMING',
    ring: 'border-l-[3px]',
  },
  UNKNOWN: {
    color: 'var(--state-unknown)',
    glyph: '◩',
    label: 'status.UNKNOWN',
    ring: 'border border-dashed',
  },
  PAUSED: {
    color: 'var(--state-paused)',
    glyph: '❙❙',
    label: 'status.PAUSED',
    ring: 'border-l-[6px]',
  },
  CLOSED: {
    color: 'var(--state-closed)',
    glyph: '✕',
    label: 'status.CLOSED',
    ring: 'border',
  },
  EXPIRED: {
    color: 'var(--state-expired)',
    glyph: '—',
    label: 'status.EXPIRED',
    ring: 'border-b-2',
  },
};

export function StatusBadge({
  status,
  t,
  size = 'md',
}: {
  status: InternalStatus;
  t: Record<MessageKey, string>;
  size?: 'sm' | 'md';
}) {
  const style = STYLES[status];
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--surface-2)] font-medium ${style.ring} ${padding}`}
      style={{ color: style.color, borderLeftColor: style.color }}
    >
      <span aria-hidden="true" className="text-[10px] leading-none">
        {style.glyph}
      </span>
      {t[style.label]}
    </span>
  );
}

export function statusColor(status: InternalStatus): string {
  return STYLES[status].color;
}
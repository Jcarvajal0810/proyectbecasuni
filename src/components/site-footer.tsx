import type { MessageKey } from '@/i18n/messages';

export function SiteFooter({ t }: { t: Record<MessageKey, string> }) {
  return (
    <footer className="mt-16 border-t border-[var(--line)] bg-[var(--surface-1)]">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--text-muted)]">
          {t['method.disclaimer']}
        </p>
        <p className="mt-4 text-xs text-[var(--text-faint)]">
          {t['nav.methodology']} · {t['nav.sources']}
        </p>
      </div>
    </footer>
  );
}
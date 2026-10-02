import type { MessageKey } from '@/i18n/messages';

/**
 * El buscador es el producto, no un elemento de una landing. El formulario es
 * un GET nativo para que la URL sea compartible y el resultado funcione sin
 * JavaScript.
 */
export function SearchForm({
  t,
  defaultQuery = '',
  defaultWindow,
}: {
  t: Record<MessageKey, string>;
  defaultQuery?: string;
  defaultWindow?: string;
}) {
  return (
    <form
      action="/becas"
      method="get"
      role="search"
      className="flex flex-col gap-3 sm:flex-row"
    >
      <div className="flex-1">
        <label htmlFor="q" className="label mb-1.5 block text-[var(--text-muted)]">
          {t['home.searchLabel']}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={defaultQuery}
          placeholder={t['home.searchLabel']}
          className="w-full rounded-[8px] border border-[var(--line-control)] bg-[var(--surface-inset)] px-3 py-2.5 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)]"
        />
      </div>

      <div>
        <label htmlFor="window_days" className="label mb-1.5 block text-[var(--text-muted)]">
          {t['home.closingSoon']}
        </label>
        <select
          id="window_days"
          name="window_days"
          defaultValue={defaultWindow ?? ''}
          className="w-full rounded-[8px] border border-[var(--line-control)] bg-[var(--surface-inset)] px-3 py-2.5 text-[15px] text-[var(--text-primary)] sm:w-44"
        >
          <option value="">{t['common.all']}</option>
          <option value="7">7 d</option>
          <option value="14">14 d</option>
          <option value="30">30 d</option>
          <option value="90">90 d</option>
        </select>
      </div>

      <div className="flex items-end">
        <button
          type="submit"
          className="w-full rounded-[8px] bg-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--accent-on)] hover:bg-[var(--accent-hover)] sm:w-auto"
        >
          {t['home.searchCta']}
        </button>
      </div>
    </form>
  );
}
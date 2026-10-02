import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { searchScholarships } from '@/db/queries';
import { detectLocale, getDictionary, format, LOCALE_COOKIE } from '@/i18n/messages';
import { SearchForm } from '@/components/search-form';
import { RecordCard } from '@/components/record-card';
import { INTERNAL_STATUSES, type InternalStatus } from '@/core/status/types';

export const metadata = { title: 'Buscar becas' };

/**
 * Tamaño de página. `offset` (no cursor) a propósito: el corpus objetivo es
 * 150–250 registros, así que el salto profundo no es un caso real y una URL
 * compartible con `?offset=` vale más que la opacidad de un cursor opaco.
 */
export const PAGE_SIZE = 24;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = detectLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get('accept-language'),
  );
  const t = getDictionary(locale);

  const q = single(params.q);
  const windowDaysRaw = single(params.window_days);
  const windowDays = windowDaysRaw === undefined ? undefined : Number(windowDaysRaw);
  const level = single(params.level);
  const country = single(params.country);
  const statusRaw = single(params.status);
  const statuses = (statusRaw?.split(',') ?? []).filter((s): s is InternalStatus =>
    (INTERNAL_STATUSES as readonly string[]).includes(s),
  );

  const offset = Math.max(0, Number(single(params.offset)) || 0);

  const { items, total, hasMore } = await searchScholarships({
    q,
    level,
    country,
    status: statuses.length > 0 ? statuses : undefined,
    windowDays: Number.isFinite(windowDays) ? windowDays : undefined,
    limit: PAGE_SIZE,
    offset,
  });

  // El recuento es de los resultados de la consulta, no de los de esta página:
  // en la página 3 decir "24 resultados" cuando hay 180 sería un dato falso.
  const countLabel =
    total === 1 ? t['common.resultsOne'] : format(t['common.results'], { n: total });

  /**
   * Reconstruye la query conservando filtros. Sin esto, "cargar más" o
   * "limpiar" perderían el contexto de búsqueda y devolverían resultados de
   * otra pregunta.
   */
  const buildHref = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams();
    const current: Record<string, string | undefined> = {
      q,
      level,
      country,
      window_days: windowDaysRaw,
      status: statusRaw,
    };
    for (const [key, value] of Object.entries({ ...current, ...next })) {
      if (value !== undefined && value !== '') merged.set(key, value);
    }
    const qs = merged.toString();
    return qs === '' ? '/becas' : `/becas?${qs}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <SearchForm
        t={t}
        defaultQuery={q ?? ''}
        defaultWindow={windowDaysRaw ?? ''}
      />

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">{countLabel}</h1>
        {(q !== undefined || windowDaysRaw !== undefined) && (
          <Link
            href="/becas"
            className="text-sm text-[var(--text-accent)] hover:text-[var(--text-accent-hi)]"
          >
            {t['common.clear']}
          </Link>
        )}
      </div>

      <div className="mt-4 grid gap-4">
        {items.map((record) => (
          <RecordCard key={record.id} record={record} t={t} />
        ))}
      </div>

      {items.length === 0 ? (
        <p className="mt-8 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-2)] p-8 text-sm text-[var(--text-secondary)]">
          {t['home.emptyTitle']} — {t['home.emptyBody']}
        </p>
      ) : null}

      {hasMore ? (
        <Link
          href={buildHref({ offset: String(offset + PAGE_SIZE) })}
          className="mt-8 inline-block rounded-[8px] border border-[var(--line-control)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
        >
          {t['common.loadMore']}
        </Link>
      ) : null}

      {offset > 0 ? (
        <Link
          href={buildHref({ offset: undefined })}
          className="mt-3 ml-4 inline-block text-sm text-[var(--text-accent)] hover:text-[var(--text-accent-hi)]"
        >
          {t['common.backToStart']}
        </Link>
      ) : null}
    </div>
  );
}

function single(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
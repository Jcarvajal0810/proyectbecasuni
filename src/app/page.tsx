import { cookies, headers } from 'next/headers';
import { searchScholarships } from '@/db/queries';
import { detectLocale, getDictionary } from '@/i18n/messages';
import { LOCALE_COOKIE } from '@/i18n/messages';
import { SearchForm } from '@/components/search-form';
import { RecordCard } from '@/components/record-card';

/**
 * Home search-first (discovery D1). Sin hero genérico ni rejilla de tres
 * tarjetas: el buscador funciona y muestra registros reales con fecha.
 */
export default async function HomePage() {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = detectLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get('accept-language'),
  );
  const t = getDictionary(locale);

  const { items } = await searchScholarships({ limit: 6, windowDays: 30 });

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[var(--text-primary)] sm:text-4xl">
          {t['home.headline']}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          {t['home.sub']}
        </p>
      </div>

      <div className="mt-8 max-w-3xl">
        <SearchForm t={t} />
      </div>

      <section className="mt-14" aria-labelledby="closing-soon">
        <h2 id="closing-soon" className="label text-[var(--text-muted)]">
          {t['home.closingSoon']}
        </h2>

        {items.length === 0 ? (
          <div className="mt-4 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-2)] p-8">
            <p className="font-medium text-[var(--text-primary)]">{t['home.emptyTitle']}</p>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
              {t['home.emptyBody']}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {items.map((record) => (
              <RecordCard key={record.id} record={record} t={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
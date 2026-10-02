import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { isDatabaseConfigured } from '@/db/client';
import { SHORTLIST_COOKIE, listShortlist } from '@/shortlist/shortlist';
import { detectLocale, format, getDictionary, LOCALE_COOKIE } from '@/i18n/messages';
import { StatusBadge } from '@/components/status-badge';
import { RemoveButton } from '@/components/remove-button';

export const metadata = { title: 'Guardadas' };

/**
 * Shortlist anónima (D5). Se lee en el servidor porque el token está en una
 * cookie `httpOnly`: el cliente no puede leerla, y no debe poder.
 */
export default async function ShortlistPage() {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = detectLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get('accept-language'),
  );
  const t = getDictionary(locale);

  const token = cookieStore.get(SHORTLIST_COOKIE)?.value ?? null;
  const items = token !== null && isDatabaseConfigured() ? await listShortlist(token) : [];

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
        {t['shortlist.title']}
      </h1>

      <p className="mt-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm leading-relaxed text-[var(--text-secondary)]">
        {t['shortlist.anonymous']}
      </p>

      {items.length > 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          {format(t['shortlist.count'], { n: items.length })}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <article
            key={item.slug}
            className="rounded-[var(--radius-record)] border border-[var(--line)] bg-[var(--surface-2)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-base font-semibold leading-snug text-[var(--text-primary)]">
                <Link href={`/becas/${item.slug}`} className="hover:text-[var(--text-accent-hi)]">
                  {item.title}
                </Link>
              </h2>
              <StatusBadge status={item.internalStatus} t={t} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <a
                href={item.officialUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-[var(--text-muted)] hover:text-[var(--text-accent-hi)]"
              >
                {t['common.sourceLink']} ↗
              </a>
              <RemoveButton
                slug={item.slug}
                label={t['shortlist.remove']}
                confirmLabel={t['shortlist.removeConfirm']}
                doneLabel={t['shortlist.removed']}
              />
            </div>
          </article>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="mt-8 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-2)] p-8 text-sm text-[var(--text-secondary)]">
          {t['shortlist.empty']}
        </p>
      ) : null}
    </div>
  );
}
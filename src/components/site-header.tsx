import Link from 'next/link';
import type { Locale, MessageKey } from '@/i18n/messages';
import { LOCALE_COOKIE } from '@/i18n/messages';

type Props = { locale: Locale; t: Record<MessageKey, string> };

const LINKS: ReadonlyArray<{ key: MessageKey; href: string }> = [
  { key: 'nav.search', href: '/becas' },
  // Fuentes y metodología comparten página (D6): dos entradas al mismo documento
  // con anclas distintas, en vez de dos páginas que divergirían al actualizarlas.
  { key: 'nav.sources', href: '/fuentes' },
  { key: 'nav.methodology', href: '/fuentes#reglas' },
  { key: 'nav.shortlist', href: '/guardadas' },
];

export function SiteHeader({ locale, t }: Props) {
  const nextLocale: Locale = locale === 'es' ? 'en' : 'es';

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface-0)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]"
        >
          {locale === 'es' ? 'Becas verificables' : 'Verifiable scholarships'}
        </Link>

        <nav aria-label={locale === 'es' ? 'Principal' : 'Main'} className="flex gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className="rounded-[8px] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            >
              {t[link.key]}
            </Link>
          ))}
        </nav>

        <form action="/api/locale" method="post" className="ml-auto">
          <input type="hidden" name="locale" value={nextLocale} />
          <input type="hidden" name="returnTo" value="/" />
          <button
            type="submit"
            aria-label={
              locale === 'es' ? 'Cambiar idioma a inglés' : 'Switch language to Spanish'
            }
            className="rounded-[8px] border border-[var(--line-control)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
          >
            {locale === 'es' ? 'EN' : 'ES'}
          </button>
        </form>
      </div>
    </header>
  );
}

export function localeCookieValue(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
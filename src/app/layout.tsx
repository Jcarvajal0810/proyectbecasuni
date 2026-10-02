import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { detectLocale, getDictionary, LOCALE_COOKIE } from '@/i18n/messages';

export const metadata: Metadata = {
  title: {
    default: 'Becas verificables',
    template: '%s · Becas verificables',
  },
  description:
    'Busca becas internacionales con enlace a la convocatoria oficial, fecha verificable y estado declarado por la fuente.',
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = detectLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get('accept-language'),
  );
  const t = getDictionary(locale);

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[8px] focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-[var(--accent-on)]"
        >
          {locale === 'es' ? 'Saltar al contenido' : 'Skip to content'}
        </a>
        <SiteHeader locale={locale} t={t} />
        <main id="contenido" className="flex-1">
          {children}
        </main>
        <SiteFooter t={t} />
      </body>
    </html>
  );
}
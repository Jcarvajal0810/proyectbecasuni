import { cookies, headers } from 'next/headers';
import { getCorpusStats, getSourceTransparency } from '@/db/queries';
import { detectLocale, format, getDictionary, LOCALE_COOKIE } from '@/i18n/messages';
import { formatVerified } from '@/components/deadline-line';
import { dataHealth } from '@/core/deadline/freshness';

export const metadata = { title: 'Fuentes' };

/**
 * Página de metodología y transparencia (discovery D6). Es obligatoria: sin ella
 * el proyecto no cumple su propio claim de verificabilidad.
 */
export default async function SourcesPage() {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = detectLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get('accept-language'),
  );
  const t = getDictionary(locale);
  const sources = await getSourceTransparency();
  const health = dataHealth(await getCorpusStats());

  const states: ReadonlyArray<[string, string]> = [
    ['OPEN', locale === 'es' ? 'La fuente declara que las solicitudes están abiertas.' : 'The source declares applications are open.'],
    ['UPCOMING', locale === 'es' ? 'La convocatoria está anunciada pero aún no abre.' : 'The call is announced but not open yet.'],
    ['CLOSED', locale === 'es' ? 'La fuente dice explícitamente que están cerradas.' : 'The source explicitly says they are closed.'],
    ['EXPIRED', locale === 'es' ? 'El deadline declarado ya pasó y la fuente no dice lo contrario.' : 'The declared deadline passed and the source does not say otherwise.'],
    ['PAUSED', locale === 'es' ? 'La fuente declara la convocatoria suspendida.' : 'The source declares the call suspended.'],
    ['UNKNOWN', locale === 'es' ? 'No se puede verificar ahora. Nunca significa cerrada: significa que no lo sabemos.' : 'Cannot be verified right now. Never means closed: it means we do not know.'],
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
        {t['method.sourcesTitle']}
      </h1>

      <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
        {t['method.disclaimer']}
      </p>

      <section className="mt-10">
        <h2 className="label text-[var(--text-muted)]">{t['method.sourcesTitle']}</h2>

        {/*
          La advertencia de retraso solo aparece cuando hay retraso real. Ponerla
          siempre sería ruido que el usuario aprende a ignorar; omitirla cuando
          los datos llevan días sin verificar sería el falso claim de este
          proyecto (discovery §5.2).
        */}
        {health.state === 'stale' || health.state === 'critical' ? (
          <p
            role="status"
            className="mt-3 rounded-[8px] border border-[var(--state-paused)]/40 bg-[var(--surface-inset)] px-4 py-3 text-sm leading-relaxed text-[var(--text-secondary)]"
          >
            {health.state === 'critical'
              ? t['method.stalenessCritical']
              : t['method.stalenessWarning']}
            {health.ageHours !== null ? ` (${format(t['method.hoursAgo'], { n: health.ageHours })})` : ''}
          </p>
        ) : null}
        <ul className="mt-3 grid gap-3">
          {sources.map((source) => (
            <li
              key={source.id}
              className="rounded-[var(--radius-record)] border border-[var(--line)] bg-[var(--surface-2)] p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <a
                  href={source.homepage}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-medium text-[var(--text-accent)] hover:text-[var(--text-accent-hi)]"
                >
                  {source.name} ↗
                </a>
                <span className="text-xs text-[var(--text-muted)]">
                  {source.count === 1
                    ? t['common.resultsOne']
                    : format(t['common.results'], { n: source.count })}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">{source.licence}</p>
              <p className="mt-1 text-xs text-[var(--text-faint)]">
                {t['method.lastFetch']}: {formatVerified(source.last_fetch_at)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 scroll-mt-20" id="reglas">
        <h2 className="label text-[var(--text-muted)]">{t['method.rulesTitle']}</h2>
        <ul className="mt-3 grid gap-3">
          {(['ruleDeadline', 'ruleStatus', 'ruleVerify'] as const).map((key) => (
            <li
              key={key}
              className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-1)] p-4 text-sm leading-relaxed text-[var(--text-secondary)]"
            >
              {t[`method.${key}`]}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="label text-[var(--text-muted)]">{t['method.statesTitle']}</h2>
        <dl className="mt-3 grid gap-3">
          {states.map(([key, description]) => (
            <div key={key} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-1)] p-4">
              <dt className="text-sm font-semibold text-[var(--text-primary)]">
                {t[`status.${key}` as keyof typeof t]}
              </dt>
              <dd className="mt-1 text-sm text-[var(--text-secondary)]">{description}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
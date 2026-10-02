import { notFound } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import type { Metadata } from 'next';
import { getScholarshipBySlug } from '@/db/queries';
import { detectLocale, getDictionary, format, LOCALE_COOKIE } from '@/i18n/messages';
import { countdownFromView } from '@/core/deadline/countdown';
import { StatusBadge } from '@/components/status-badge';
import { DeadlineLine, formatVerified } from '@/components/deadline-line';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const record = await getScholarshipBySlug(slug);
  if (record === null) return { title: 'No encontrado' };
  return {
    title: record.title,
    description: `${record.provider ?? record.source_licence} · ${record.source_url}`,
    alternates: { canonical: `/becas/${record.slug}` },
  };
}

export default async function ScholarshipPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const record = await getScholarshipBySlug(slug);
  if (record === null) notFound();

  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = detectLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get('accept-language'),
  );
  const t = getDictionary(locale);

  const view = countdownFromView(record.countdown_raw, record.deadline_precision);

  const rows: ReadonlyArray<[string, string | null]> = [
    [t['field.provider'], record.provider],
    [t['field.university'], record.university],
    [t['field.country'], record.country_iso2],
    [t['field.level'], record.level],
    [t['field.cycle'], record.cycle_label],
  ];

  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-[var(--text-primary)]">
          {record.title}
        </h1>
        <StatusBadge status={record.internal_status} t={t} />
      </div>

      {record.internal_status === 'UNKNOWN' ? (
        <p className="mt-6 rounded-[var(--radius-panel)] border border-dashed border-[var(--state-unknown)]/40 bg-[var(--surface-inset)] p-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          {t['detail.unknownExplain']}
          {record.last_known_status !== null ? (
            <span className="mt-1 block text-xs text-[var(--text-faint)]">
              {format(t['detail.lastKnown'], {
                status: t[`status.${record.last_known_status}` as keyof typeof t],
              })}
            </span>
          ) : null}
        </p>
      ) : null}

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        {rows
          .filter(([, value]) => value !== null && value !== '')
          .map(([label, value]) => (
            <div key={label}>
              <dt className="label text-[var(--text-faint)]">{label}</dt>
              <dd className="mt-1 text-sm text-[var(--text-secondary)]">{value}</dd>
            </div>
          ))}
      </dl>

      <div className="mt-8 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-2)] p-5">
        <DeadlineLine
          deadlineAt={record.deadline_at}
          deadlineBasis={record.deadline_basis}
          deadlineRawText={record.deadline_raw_text}
          countdownDays={view.days}
          countdownHours={view.hours}
          deadlineTz={record.deadline_tz}
          t={t}
        />
      </div>

      <section className="mt-8">
        <h2 className="label text-[var(--text-faint)]">{t['field.reason']}</h2>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{record.status_reason}</p>
      </section>

      <section className="mt-8 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-1)] p-5">
        <h2 className="label text-[var(--text-faint)]">{t['field.source']}</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{record.source_licence}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {t['field.lastVerified']}: {formatVerified(record.last_verified_at)}
        </p>
        <a
          href={record.source_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-4 inline-block rounded-[8px] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-on)] hover:bg-[var(--accent-hover)]"
        >
          {t['detail.openSource']} ↗
        </a>
      </section>
    </article>
  );
}
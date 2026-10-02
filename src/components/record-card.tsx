import Link from 'next/link';
import type { PublicScholarship } from '@/db/queries';
import type { MessageKey } from '@/i18n/messages';
import { format } from '@/i18n/messages';
import { countdownFromView } from '@/core/deadline/countdown';
import { StatusBadge } from './status-badge';
import { DeadlineLine, formatVerified } from './deadline-line';
import { SaveButton } from './save-button';

export function RecordCard({
  record,
  t,
}: {
  record: PublicScholarship;
  t: Record<MessageKey, string>;
}) {
  const view = countdownFromView(record.countdown_raw, record.deadline_precision);
  return (
    <article className="rounded-[var(--radius-record)] border border-[var(--line)] bg-[var(--surface-2)] p-5 hover:border-[var(--line-control)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug text-[var(--text-primary)]">
            <Link href={`/becas/${record.slug}`} className="hover:text-[var(--text-accent-hi)]">
              {record.title}
            </Link>
          </h3>
          {record.provider !== null ? (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{record.provider}</p>
          ) : null}
        </div>
        <StatusBadge status={record.internal_status} t={t} />
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <DeadlineLine
          deadlineAt={record.deadline_at}
          deadlineBasis={record.deadline_basis}
          deadlineRawText={record.deadline_raw_text}
          countdownDays={view.days}
          countdownHours={view.hours}
          deadlineTz={record.deadline_tz}
          t={t}
        />

        <div className="flex flex-col gap-1">
          <span className="label text-[var(--text-faint)]">{t['field.lastVerified']}</span>
          <span className="text-sm text-[var(--text-muted)]">
            {formatVerified(record.last_verified_at)}
          </span>
        </div>
      </dl>

      {record.internal_status === 'UNKNOWN' ? (
        <p className="mt-3 rounded-[8px] border border-dashed border-[var(--state-unknown)]/40 bg-[var(--surface-inset)] px-3 py-2 text-sm text-[var(--text-secondary)]">
          {t['detail.unknownExplain']}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <Link
          href={`/becas/${record.slug}`}
          className="font-medium text-[var(--text-accent)] hover:text-[var(--text-accent-hi)]"
        >
          {t['common.readMore']}
        </Link>
        <a
          href={record.source_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-[var(--text-muted)] hover:text-[var(--text-accent-hi)]"
        >
          {t['common.sourceLink']} ↗
        </a>
        {record.last_known_status !== null && record.internal_status === 'UNKNOWN' ? (
          <span className="text-xs text-[var(--text-faint)]">
            {format(t['detail.lastKnown'], {
              status: t[`status.${record.last_known_status}` as MessageKey],
            })}
          </span>
        ) : null}
        <SaveButton
          slug={record.slug}
          label={t['shortlist.save']}
          savedLabel={t['shortlist.saved']}
          errorLabel={t['shortlist.saveError']}
        />
      </div>
    </article>
  );
}
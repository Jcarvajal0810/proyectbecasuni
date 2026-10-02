import type { TransactionSql } from 'postgres';
import { getDb } from '../db/client';
import { resolveStatus } from '../core/status/resolve-status';
import type { ResolvedStatus } from '../core/status/types';
import { safeHttp } from '../fetch/safe-http-client';
import { eaceaAdapter } from '../adapters/eacea/adapter';
import type { NormalizedRecord, SourceAdapter } from '../adapters/source-adapter';

/**
 * Pipeline de sync. Escribe solo campos allowlisted, decide el estado solo con
 * `resolveStatus()` y nunca borra evidencia verificada a causa de un fallo.
 */

const ADAPTERS: readonly SourceAdapter[] = [eaceaAdapter];

const MAX_RECORDS_PER_RUN = 20;

type Tx = TransactionSql<Record<string, never>>;

export type SyncRunReport = {
  readonly sourceId: string;
  readonly outcome:
    | 'ok'
    | 'not_modified'
    | 'failed'
    | 'skipped_locked'
    | 'skipped_manual'
    | 'skipped_kill_switch'
    | 'skipped_circuit_open';
  readonly fetchOutcome: string | null;
  readonly itemsSeen: number;
  readonly itemsWritten: number;
  readonly itemsFlagged: number;
  readonly durationMs: number;
  readonly detail: string | null;
};

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

export async function syncSource(adapter: SourceAdapter): Promise<SyncRunReport> {
  const db = getDb();
  const sourceId = adapter.descriptor.id;

  const report = await db.begin(async (tx) => {
    const lock = await tx<{ acquired: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(hashtext(${sourceId})) AS acquired
    `;
    if (lock[0]?.acquired !== true) {
      return skipped(sourceId, 'skipped_locked', 'Otra corrida sostiene el lock: no se solapan syncs');
    }

    await tx`
      INSERT INTO sources (id, name, homepage, licence, kind, legal_clearance, feed_url)
      VALUES (
        ${sourceId}, ${adapter.descriptor.name}, ${adapter.descriptor.homepage},
        ${adapter.descriptor.licence}, ${adapter.descriptor.kind},
        ${adapter.descriptor.legalClearance}, ${adapter.descriptor.feedUrl}
      )
      ON CONFLICT (id) DO NOTHING
    `;

    const [source] = await tx<{
      kill_switch: boolean;
      etag: string | null;
      health_status: string;
      consecutive_failures: number;
      circuit_opened_at: Date | null;
      circuit_threshold: number;
      circuit_cooldown_ms: number;
    }[]>`
      SELECT kill_switch, etag, health_status, consecutive_failures,
             circuit_opened_at,
             circuit_threshold,
             EXTRACT(EPOCH FROM circuit_cooldown)::int AS circuit_cooldown_ms
        FROM sources WHERE id = ${sourceId}
    `;
    if (source === undefined) {
      return skipped(sourceId, 'skipped_locked', 'Fuente ausente tras el upsert');
    }
    if (source.kill_switch) {
      return skipped(sourceId, 'skipped_kill_switch', 'Kill switch activo: no se intentó el fetch');
    }

    // El circuit breaker corta el tráfico: antes solo se registraba y la fuente
    // seguía recibiendo peticiones en cada corrida.
    //
    // Pero sin cooldown el circuito abierto es ABSORBENTE: como no hace fetch,
    // nunca acumula el éxito que lo cierra, y un corte de red de un minuto deja
    // la fuente muerta para siempre. Pasado el cooldown se permite un fetch de
    // prueba (half-open).
    if (source.health_status === 'circuit_open') {
      const openedAt = source.circuit_opened_at;
      const cooldownMs = source.circuit_cooldown_ms * 1000;
      const elapsedMs = openedAt === null ? Number.POSITIVE_INFINITY : Date.now() - openedAt.getTime();

      if (openedAt === null || elapsedMs < cooldownMs) {
        const restanteMin = openedAt === null ? null : Math.ceil((cooldownMs - elapsedMs) / 60_000);
        return skipped(
          sourceId,
          'skipped_circuit_open',
          `Circuito abierto tras ${source.consecutive_failures} fallos consecutivos: ` +
            `sin fetch${restanteMin === null ? '' : `; reintento en ~${restanteMin} min`}`,
        );
      }

      // Half-open: un único fetch de prueba. `recordSuccess` cierra el circuito
      // si funciona; si falla, `recordFailure` reabre y reinicia el cooldown.
      await tx`
        UPDATE sources
           SET health_status = 'degraded', circuit_opened_at = NULL
         WHERE id = ${sourceId}
      `;
    }

    return runPipeline(tx, adapter, source.etag);
  });

  await db`
    INSERT INTO sync_runs (
      source_id, outcome, fetch_outcome, items_seen, items_parsed,
      items_written, items_flagged, duration_ms, detail, finished_at
    ) VALUES (
      ${report.sourceId}, ${report.outcome}, ${report.fetchOutcome},
      ${report.itemsSeen}, ${report.itemsSeen}, ${report.itemsWritten},
      ${report.itemsFlagged}, ${report.durationMs}, ${report.detail}, now()
    )
  `;

  return report;
}

function skipped(
  sourceId: string,
  outcome: SyncRunReport['outcome'],
  detail: string,
): SyncRunReport {
  return {
    sourceId,
    outcome,
    fetchOutcome: null,
    itemsSeen: 0,
    itemsWritten: 0,
    itemsFlagged: 0,
    durationMs: 0,
    detail,
  };
}

async function runPipeline(
  tx: Tx,
  adapter: SourceAdapter,
  etag: string | null,
): Promise<SyncRunReport> {
  const started = Date.now();
  const sourceId = adapter.descriptor.id;
  const feedUrl = adapter.descriptor.feedUrl;

  if (feedUrl === null) {
    return skipped(
      sourceId,
      'skipped_manual',
      'Fuente manual (D14): se curan a mano, no por feed',
    );
  }

  const result = await safeHttp.fetch(feedUrl, { sourceId, etag });

  if (result.outcome === 'not_modified') {
    // Un 304 es fetch exitoso, pero mover `last_verified_at` sería una mentira
    // técnica: no re-leímos nada. Solo se mueve `last_seen_at`.
    await recordSuccess(tx, sourceId);
    await tx`
      UPDATE sources SET last_fetch_at = now() WHERE id = ${sourceId}
    `;
    return {
      sourceId,
      outcome: 'not_modified',
      fetchOutcome: 'not_modified',
      itemsSeen: 0,
      itemsWritten: 0,
      itemsFlagged: 0,
      durationMs: Date.now() - started,
      detail: '304 sin cambios: last_verified_at intacto a propósito',
    };
  }

  if (result.outcome !== 'ok' || result.body === undefined) {
    await recordFailure(tx, sourceId, result.outcome);
    return {
      sourceId,
      outcome: 'failed',
      fetchOutcome: result.outcome,
      itemsSeen: 0,
      itemsWritten: 0,
      itemsFlagged: 0,
      durationMs: Date.now() - started,
      detail: `Fetch fallido: ${result.outcome}`,
    };
  }

  const parsed = adapter.parse(result.body);
  if (!parsed.ok) {
    // El cuerpo llegó bien pero no se pudo parsear: `challenge_page` sería un
    // diagnóstico falso. El outcome honesto es `content_type_rejected`.
    await recordFailure(tx, sourceId, 'content_type_rejected');
    return {
      sourceId,
      outcome: 'failed',
      fetchOutcome: 'content_type_rejected',
      itemsSeen: 0,
      itemsWritten: 0,
      itemsFlagged: 0,
      durationMs: Date.now() - started,
      detail: parsed.reason,
    };
  }

  const budgeted = parsed.records.slice(0, MAX_RECORDS_PER_RUN);
  const now = new Date();
  let written = 0;
  let flagged = 0;

  for (const record of budgeted) {
    const resolved = resolveStatus({
      fetchOutcome: 'ok',
      evidence: record.evidence,
      now,
      readerTimeZone: 'UTC',
    });
    if (resolved.needsReview) flagged += 1;
    await upsertRecord(tx, adapter, record, resolved, now);
    written += 1;
  }

  await recordSuccess(tx, sourceId);
  await tx`
    UPDATE sources
       SET last_fetch_at = now(), etag = ${result.etag ?? null}
     WHERE id = ${sourceId}
  `;

  return {
    sourceId,
    outcome: 'ok',
    fetchOutcome: 'ok',
    itemsSeen: parsed.records.length,
    itemsWritten: written,
    itemsFlagged: flagged,
    durationMs: Date.now() - started,
    detail:
      parsed.records.length > budgeted.length
        ? `Presupuesto de run: ${written} de ${parsed.records.length} procesados`
        : null,
  };
}

async function recordFailure(tx: Tx, sourceId: string, outcome: string): Promise<void> {
  // El umbral y el cooldown son por fuente. Al reabrir se reinicia
  // `circuit_opened_at`: un half-open fallido cuenta como un fallo más y espera
  // otro cooldown completo antes del siguiente intento.
  await tx`
    UPDATE sources
       SET last_fetch_at = now(),
           consecutive_failures = consecutive_failures + 1,
           health_status = CASE
             WHEN consecutive_failures + 1 >= circuit_threshold THEN 'circuit_open'
             WHEN ${outcome} IN ('http_4xx', 'challenge_page')      THEN 'degraded'
             ELSE health_status
           END,
           circuit_opened_at = CASE
             WHEN consecutive_failures + 1 >= circuit_threshold THEN now()
             ELSE circuit_opened_at
           END
     WHERE id = ${sourceId}
  `;
}

async function recordSuccess(tx: Tx, sourceId: string): Promise<void> {
  // Cerrar el circuito es parte del éxito, no un extra: sin esto la fuente
  // queda en `circuit_open` para siempre aunque el fetch funcione.
  await tx`
    UPDATE sources
       SET health_status = 'healthy', consecutive_failures = 0, circuit_opened_at = NULL
     WHERE id = ${sourceId}
  `;
}

async function upsertRecord(
  tx: Tx,
  adapter: SourceAdapter,
  record: NormalizedRecord,
  resolved: ResolvedStatus,
  now: Date,
): Promise<void> {
  const slug = `${slugify(record.title)}-${record.sourceRecordId.slice(-6)}`;
  const nowIso = now.toISOString();
  const searchInput = [
    record.title,
    record.provider ?? '',
    record.university ?? '',
    record.cycleLabel ?? '',
  ].join(' ');

  // Se lee el estado ANTES del UPSERT: `EXCLUDED` no es visible en RETURNING y
  // una subconsulta correlacionada ahí solo ve el estado post-update, así que la
  // comparación tiene que hacerse con el valor previo.
  const previous = await tx<{ readonly internal_status: string }[]>`
    SELECT internal_status FROM scholarships
     WHERE source_id = ${adapter.descriptor.id}
       AND source_record_id = ${record.sourceRecordId}
  `;
  const previousStatus = previous[0]?.internal_status;

  const rows = await tx<{ id: string; internal_status: string }[]>`
    INSERT INTO scholarships (
      slug, source_id, source_record_id, title, provider, university,
      official_url, source_url, application_url, country_iso2, level, fields,
      funding_type, cycle_label,
      source_status, internal_status, status_confidence, status_reason,
      preserve_last_known, needs_review,
      last_known_status, last_known_status_at,
      deadline_at, deadline_basis, deadline_precision, deadline_tz, deadline_raw_text,
      source_licence, legal_clearance, discovered_via,
      last_verified_at, last_seen_at, search_tsv
    ) VALUES (
      ${slug}, ${adapter.descriptor.id}, ${record.sourceRecordId}, ${record.title},
      ${record.provider}, ${record.university},
      ${record.officialUrl}, ${record.officialUrl}, ${record.applicationUrl},
      ${record.countryIso2}, ${record.level}, ${record.fields},
      ${record.fundingType}, ${record.cycleLabel},
      ${record.evidence.sourceStatus}, ${resolved.status}, ${resolved.confidence},
      ${resolved.reason}, ${resolved.preserveLastKnown}, ${resolved.needsReview},
      ${resolved.preserveLastKnown ? null : resolved.status},
      ${resolved.preserveLastKnown ? null : nowIso},
      ${record.deadlineAt}, ${record.deadlineBasis}, ${record.deadlinePrecision},
      ${record.deadlineTz}, ${record.deadlineRawText},
      ${adapter.descriptor.licence}, ${adapter.descriptor.legalClearance}, 'automated',
      ${nowIso}, ${nowIso},
      to_tsvector('simple', f_unaccent(${searchInput}))
    )
    ON CONFLICT (source_id, source_record_id) DO UPDATE SET
      title            = EXCLUDED.title,
      provider         = EXCLUDED.provider,
      official_url     = EXCLUDED.official_url,
      application_url  = EXCLUDED.application_url,
      country_iso2     = EXCLUDED.country_iso2,
      cycle_label      = EXCLUDED.cycle_label,
      source_status    = EXCLUDED.source_status,
      internal_status  = EXCLUDED.internal_status,
      status_confidence= EXCLUDED.status_confidence,
      status_reason    = EXCLUDED.status_reason,
      preserve_last_known = EXCLUDED.preserve_last_known,
      needs_review     = EXCLUDED.needs_review,
      last_known_status = CASE WHEN EXCLUDED.preserve_last_known
        THEN scholarships.last_known_status ELSE EXCLUDED.last_known_status END,
      last_known_status_at = CASE WHEN EXCLUDED.preserve_last_known
        THEN scholarships.last_known_status_at ELSE EXCLUDED.last_known_status_at END,
      deadline_at      = EXCLUDED.deadline_at,
      deadline_basis   = EXCLUDED.deadline_basis,
      deadline_precision = EXCLUDED.deadline_precision,
      deadline_tz      = EXCLUDED.deadline_tz,
      deadline_raw_text= EXCLUDED.deadline_raw_text,
      last_verified_at = EXCLUDED.last_verified_at,
      last_seen_at     = EXCLUDED.last_seen_at,
      updated_at       = now(),
      search_tsv       = EXCLUDED.search_tsv
    RETURNING id, internal_status
  `;

  const row = rows[0];
  if (row === undefined) return;

  // El histórico registra TRANSICIONES, no cada corrida: un sync que confirma el
  // mismo estado no es un cambio. Antes, `from_status` era siempre NULL.
  if (previousStatus !== undefined && previousStatus !== resolved.status) {
    await tx`
      INSERT INTO status_history (scholarship_id, from_status, to_status, reason, evidence_json, changed_by)
      VALUES (${row.id}, ${previousStatus}, ${resolved.status}, ${resolved.reason},
              ${tx.json({ fetchOutcome: 'ok', deadlineBasis: record.deadlineBasis })}, 'sync')
    `;
  }

  for (const [field, prov] of Object.entries(record.provenance)) {
    await tx`
      INSERT INTO field_provenance (scholarship_id, field, source_field_path, parse_confidence)
      VALUES (${row.id}, ${field}, ${prov.sourceFieldPath}, ${prov.parseConfidence})
      ON CONFLICT (scholarship_id, field) DO UPDATE
        SET source_field_path = EXCLUDED.source_field_path,
            parse_confidence  = EXCLUDED.parse_confidence,
            captured_at       = now()
    `;
  }
}

export async function syncAll(): Promise<SyncRunReport[]> {
  const reports: SyncRunReport[] = [];
  for (const adapter of ADAPTERS) {
    reports.push(await syncSource(adapter));
  }
  return reports;
}
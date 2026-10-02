/**
 * Tipos del dominio. Capa `core/` — sin I/O, sin `Date.now()`, sin DB.
 * La Forbidden de importar `adapters/`, `db/`, `fetch`, `next/*` es lo que
 * hace verificable la pureza (architecture §6.2 / data-strategy §3).
 */

export const INTERNAL_STATUSES = [
  'OPEN',
  'UPCOMING',
  'CLOSED',
  'EXPIRED',
  'PAUSED',
  'UNKNOWN',
] as const;

export type InternalStatus = (typeof INTERNAL_STATUSES)[number];

export const STATUS_CONFIDENCE = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type StatusConfidence = (typeof STATUS_CONFIDENCE)[number];

/** Los 18 valores de `FetchOutcome` (data-strategy §3.2 + §3.3). */
export const FETCH_OUTCOMES = [
  'ok',
  'not_modified',
  'timeout',
  'dns_error',
  'connection_refused',
  'tls_error',
  'http_4xx',
  'http_5xx',
  'too_large',
  'blocked_scheme',
  'blocked_host',
  'blocked_ip',
  'redirect_violation',
  'rate_limited',
  'circuit_open',
  'content_type_rejected',
  'challenge_page',
  'budget_exhausted',
  /**
   * Fallo nuestro, no del origen (bug, excepción no clasificada). Existe para
   * que un defecto interno nunca se reporte como `http_5xx`: eso mandaría la
   * fuente al circuit breaker y publicaría un estado `UNKNOWN` sin causa real.
   */
  'internal_error',
] as const;

export type FetchOutcome = (typeof FETCH_OUTCOMES)[number];

/**
 * Todo outcome que no es éxito ni `not_modified` es un fallo. Cualquier otro
 * outcome pasa a evaluar evidencia de contenido en `resolveStatus()`.
 */
export const FETCH_FAILURES: readonly FetchOutcome[] = FETCH_OUTCOMES.filter(
  (o) => o !== 'ok' && o !== 'not_modified',
);

export const DEADLINE_BASES = [
  'publisher_stated',
  'inferred_from_cycle',
  'unknown',
] as const;
export type DeadlineBasis = (typeof DEADLINE_BASES)[number];

export const DEADLINE_PRECISIONS = [
  'MINUTE',
  'HOUR',
  'DATE',
  'UNKNOWN',
] as const;
export type DeadlinePrecision = (typeof DEADLINE_PRECISIONS)[number];

/** `source_status`: lo que la fuente declara explícitamente en un campo allowlisted. */
export const SOURCE_STATUSES = [
  'OPEN',
  'UPCOMING',
  'CLOSED',
  'PAUSED',
  'UNKNOWN',
] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

/**
 * Evidencia de contenido. Todo campo llega desde un campo allowlisted de la
 * fuente con su `source_field_path` registrado en `field_provenance`.
 * Nunca desde un valor inferido del cuerpo del texto (data-strategy §3.5).
 */
export type StatusEvidence = {
  /** Estado declarado por la fuente en un enum allowlisted. */
  readonly sourceStatus: SourceStatus | null;
  /** Instante absoluto del deadline. `null` = la fuente no dio deadline. */
  readonly deadlineAt: Date | null;
  readonly deadlineBasis: DeadlineBasis;
  /** El adapter detectó una declaración explícita de cierre (con field path). */
  readonly sourceExplicitlySaysClosed: boolean;
  /** El adapter detectó una declaración explícita de suspensión. */
  readonly sourceExplicitlySaysPaused: boolean;
  /**
   * `date` sin hora, tal como la fuente lo declara. NO se convierte a
   * `timestamptz`: hacerlo inventaría una hora que la fuente no dio.
   */
  readonly openingDate: string | null;
};

/** Contexto de evaluación. `now` se inyecta: la función no lee el reloj. */
export type SyncContext = {
  /** Instante de referencia. Lo inyecta `SyncContext`, nunca `Date.now()`. */
  readonly now: Date;
  /** Zona IANA del lector, para comparar `opening_date` (un `date`). */
  readonly readerTimeZone: string;
  /** Código HTTP cuando `fetchOutcome` es `http_4xx` / `http_5xx`. */
  readonly httpStatus?: number;
};

export type StatusInput = {
  readonly fetchOutcome: FetchOutcome;
  readonly evidence: StatusEvidence;
} & SyncContext;

export type ResolvedStatus = {
  readonly status: InternalStatus;
  readonly confidence: StatusConfidence;
  /** No-nullable por tipo (data-strategy §3.1): `UNKNOWN` siempre explica por qué. */
  readonly reason: string;
  /**
   * `true` ⇒ NO escribir `last_known_status`; el estado previo sobrevive intacto
   * (ADR-002(e)). Los 16 fallos de red usan `true`.
   */
  readonly preserveLastKnown: boolean;
  /** `true` ⇒ tarea en la cola de revisión humana (no reintento). */
  readonly needsReview: boolean;
};
import type {
  DeadlineBasis,
  DeadlinePrecision,
  SourceStatus,
  StatusEvidence,
} from '../core/status/types';

/**
 * Contrato de adapter (technical-blueprint §3.1).
 *
 * Un adapter traduce la respuesta cruda de UNA fuente a `NormalizedRecord`.
 * No escribe en DB, no decide estado, no conoce la UI. El estado lo decide
 * exclusivamente `resolveStatus()` con la evidencia que el adapter declara.
 */

export const FUNDING_TYPES = ['FULL', 'PARTIAL', 'TUITION', 'STIPEND', 'UNKNOWN'] as const;
export type FundingType = (typeof FUNDING_TYPES)[number];

export type FieldProvenance = {
  /** Path exacto en el documento de origen: `item.link`, `dc:date`, etc. */
  readonly sourceFieldPath: string;
  /** Solo `ok` si el valor came de un campo allowlisted de la fuente. */
  readonly parseConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
};

export type NormalizedRecord = {
  /** Identidad estable dentro de la fuente. La deduplicación la usa. */
  readonly sourceRecordId: string;
  readonly title: string;
  readonly provider: string | null;
  readonly university: string | null;
  readonly officialUrl: string | null;
  readonly applicationUrl: string | null;
  readonly countryIso2: string | null;
  readonly level: string | null;
  readonly fields: readonly string[];
  readonly fundingType: FundingType;
  readonly cycleLabel: string | null;
  /** Evidencia para `resolveStatus()`. Nunca un estado decidido aquí. */
  readonly evidence: StatusEvidence;
  readonly deadlineAt: Date | null;
  readonly deadlineBasis: DeadlineBasis;
  readonly deadlinePrecision: DeadlinePrecision;
  readonly deadlineTz: string | null;
  /** Verbatim del deadline tal como lo escribió la fuente. */
  readonly deadlineRawText: string | null;
  readonly provenance: Readonly<Record<string, FieldProvenance>>;
};

export type ParseOutcome =
  | { readonly ok: true; readonly records: readonly NormalizedRecord[] }
  | { readonly ok: false; readonly reason: string; readonly needsReview: true };

export type SourceDescriptor = {
  readonly id: string;
  readonly name: string;
  readonly homepage: string;
  readonly licence: string;
  readonly kind: 'automated' | 'manual';
  /** URL del feed delta. `null` para fuentes manuales. */
  readonly feedUrl: string | null;
  /** `true` solo si `legal-matrix` lo autoriza. */
  readonly legalClearance: 'CLEARED' | 'MANUAL_ONLY' | 'DO_NOT_USE';
};

export type SourceAdapter = {
  readonly descriptor: SourceDescriptor;
  parse(body: string): ParseOutcome;
};

export const EMPTY_EVIDENCE: StatusEvidence = {
  sourceStatus: null,
  deadlineAt: null,
  deadlineBasis: 'unknown',
  sourceExplicitlySaysClosed: false,
  sourceExplicitlySaysPaused: false,
  openingDate: null,
};

export function isSourceStatus(value: string): value is SourceStatus {
  return ['OPEN', 'UPCOMING', 'CLOSED', 'PAUSED', 'UNKNOWN'].includes(value);
}
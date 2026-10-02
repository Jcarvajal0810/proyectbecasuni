import { describe, expect, it } from 'vitest';
import { resolveStatus } from '../src/core/status/resolve-status';
import {
  FETCH_FAILURES,
  type DeadlineBasis,
  type SourceStatus,
  type StatusEvidence,
} from '../src/core/status/types';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const FUTURE = new Date('2026-04-01T12:00:00.000Z');
const PAST = new Date('2026-02-01T12:00:00.000Z');

function evidence(overrides: Partial<StatusEvidence> = {}): StatusEvidence {
  return {
    sourceStatus: null,
    deadlineAt: null,
    deadlineBasis: 'unknown',
    sourceExplicitlySaysClosed: false,
    sourceExplicitlySaysPaused: false,
    openingDate: null,
    ...overrides,
  };
}

/**
 * Evidencia que, por sí sola, produciría OPEN. Ningún fetchOutcome de fallo
 * puede dejar de producir UNKNOWN con esta evidencia (data-strategy §3.7 Grupo A).
 */
const WOULD_BE_OPEN: StatusEvidence = evidence({
  sourceStatus: 'OPEN',
  deadlineAt: FUTURE,
  deadlineBasis: 'publisher_stated',
});

describe('resolveStatus — Grupo A: los 16 fallos NUNCA producen OPEN ni CLOSED', () => {
  it('cubre exactamente 17 fallos (los 16 de la baseline + internal_error)', () => {
    // 17 y no 16: `internal_error` se añadió para que un bug propio no se
    // reporte como `http_5xx` de la fuente. Mantener el número en un test es
    // lo que hace visible esa decisión en vez de perderla en un diff.
    expect(FETCH_FAILURES).toHaveLength(17);
  });

  for (const outcome of FETCH_FAILURES) {
    it(`${outcome} → UNKNOWN, preserveLastKnown, reason no vacío`, () => {
      const resolved = resolveStatus({
        fetchOutcome: outcome,
        evidence: WOULD_BE_OPEN,
        now: NOW,
        readerTimeZone: 'UTC',
      });

      expect(resolved.status).toBe('UNKNOWN');
      expect(resolved.status).not.toBe('CLOSED');
      expect(resolved.status).not.toBe('EXPIRED');
      expect(resolved.preserveLastKnown).toBe(true);
      expect(resolved.reason).not.toBe('');
      expect(resolved.reason).toBeTypeOf('string');
    });
  }

  it('un fallo con deadline pasado tampoco produce EXPIRED ni CLOSED', () => {
    for (const outcome of FETCH_FAILURES) {
      const resolved = resolveStatus({
        fetchOutcome: outcome,
        evidence: evidence({
          sourceStatus: 'OPEN',
          deadlineAt: PAST,
          deadlineBasis: 'publisher_stated',
        }),
        now: NOW,
        readerTimeZone: 'UTC',
      });
      expect(resolved.status).toBe('UNKNOWN');
      expect(resolved.preserveLastKnown).toBe(true);
    }
  });
});

describe('resolveStatus — Grupo B: la ladder de éxito', () => {
  const base = { now: NOW, readerTimeZone: 'UTC' };

  it('S-1 CLOSED explícito por status de fuente', () => {
    const r = resolveStatus({
      fetchOutcome: 'ok',
      evidence: evidence({ sourceStatus: 'CLOSED' }),
      ...base,
    });
    expect(r.status).toBe('CLOSED');
    expect(r.preserveLastKnown).toBe(false);
  });

  it('S-1 CLOSED explícito por flag del adapter', () => {
    const r = resolveStatus({
      fetchOutcome: 'ok',
      evidence: evidence({ sourceExplicitlySaysClosed: true }),
      ...base,
    });
    expect(r.status).toBe('CLOSED');
  });

  it('CLOSED gana sobre un deadline futuro en el mismo registro', () => {
    const r = resolveStatus({
      fetchOutcome: 'ok',
      evidence: evidence({
        sourceStatus: 'CLOSED',
        deadlineAt: FUTURE,
        deadlineBasis: 'publisher_stated',
      }),
      ...base,
    });
    expect(r.status).toBe('CLOSED');
  });

  it('S-2 PAUSED explícito', () => {
    const r = resolveStatus({
      fetchOutcome: 'ok',
      evidence: evidence({ sourceStatus: 'PAUSED' }),
      ...base,
    });
    expect(r.status).toBe('PAUSED');
  });

  it('S-3 UPCOMING explícito', () => {
    const r = resolveStatus({
      fetchOutcome: 'ok',
      evidence: evidence({ sourceStatus: 'UPCOMING' }),
      ...base,
    });
    expect(r.status).toBe('UPCOMING');
  });

  it('S-5 OPEN + deadline pasado → UNKNOWN + revisión, nunca OPEN', () => {
    const r = resolveStatus({
      fetchOutcome: 'ok',
      evidence: evidence({
        sourceStatus: 'OPEN',
        deadlineAt: PAST,
        deadlineBasis: 'publisher_stated',
      }),
      ...base,
    });
    expect(r.status).toBe('UNKNOWN');
    expect(r.needsReview).toBe(true);
    expect(r.preserveLastKnown).toBe(true);
  });

  it('S-6 OPEN + deadline inferido → UNKNOWN, no OPEN', () => {
    const r = resolveStatus({
      fetchOutcome: 'ok',
      evidence: evidence({
        sourceStatus: 'OPEN',
        deadlineAt: FUTURE,
        deadlineBasis: 'inferred_from_cycle',
      }),
      ...base,
    });
    expect(r.status).toBe('UNKNOWN');
    expect(r.preserveLastKnown).toBe(true);
  });

  it('S-8 openingDate futuro → UPCOMING (no OPEN)', () => {
    const r = resolveStatus({
      fetchOutcome: 'ok',
      evidence: evidence({
        sourceStatus: 'OPEN',
        deadlineAt: FUTURE,
        deadlineBasis: 'publisher_stated',
        openingDate: '2026-06-01',
      }),
      ...base,
    });
    expect(r.status).toBe('UPCOMING');
  });

  it('S-9 deadline pasado declarado y la fuente no dice OPEN → EXPIRED, no CLOSED', () => {
    const r = resolveStatus({
      fetchOutcome: 'ok',
      evidence: evidence({
        deadlineAt: PAST,
        deadlineBasis: 'publisher_stated',
      }),
      ...base,
    });
    expect(r.status).toBe('EXPIRED');
    expect(r.status).not.toBe('CLOSED');
  });

  it('S-10 deadline estimado pasado → UNKNOWN, no EXPIRED ni CLOSED', () => {
    const r = resolveStatus({
      fetchOutcome: 'ok',
      evidence: evidence({
        deadlineAt: PAST,
        deadlineBasis: 'inferred_from_cycle',
      }),
      ...base,
    });
    expect(r.status).toBe('UNKNOWN');
    expect(r.preserveLastKnown).toBe(true);
  });

  it('S-11 sin información suficiente → UNKNOWN', () => {
    const r = resolveStatus({ fetchOutcome: 'ok', evidence: evidence(), ...base });
    expect(r.status).toBe('UNKNOWN');
    expect(r.confidence).toBe('LOW');
  });

  it('not_modified se comporta como ok', () => {
    const modified = resolveStatus({
      fetchOutcome: 'ok',
      evidence: WOULD_BE_OPEN,
      ...base,
    });
    const notModified = resolveStatus({
      fetchOutcome: 'not_modified',
      evidence: WOULD_BE_OPEN,
      ...base,
    });
    expect(notModified).toEqual(modified);
  });
});

describe('resolveStatus — Grupo C: invariantes de contrato', () => {
  const base = { now: NOW, readerTimeZone: 'UTC' };

  it('C-2 CLOSED solo es alcanzable con evidencia explícita', () => {
    for (const outcome of FETCH_FAILURES) {
      const r = resolveStatus({ fetchOutcome: outcome, evidence: evidence(), ...base });
      expect(r.status).not.toBe('CLOSED');
    }
    const withoutFlag = resolveStatus({
      fetchOutcome: 'ok',
      evidence: evidence({ deadlineAt: PAST, deadlineBasis: 'publisher_stated' }),
      ...base,
    });
    expect(withoutFlag.status).not.toBe('CLOSED');
  });

  it('C-3 OPEN exige status de fuente o deadline futuro declarado', () => {
    const r = resolveStatus({
      fetchOutcome: 'ok',
      evidence: evidence({ deadlineAt: FUTURE, deadlineBasis: 'publisher_stated' }),
      ...base,
    });
    expect(r.status).toBe('OPEN');
    const statusWasNull = evidence({ deadlineAt: FUTURE, deadlineBasis: 'publisher_stated' });
    expect(statusWasNull.sourceStatus).toBeNull();
  });

  it('C-4 no muta la evidencia de entrada', () => {
    const input = evidence({
      sourceStatus: 'OPEN',
      deadlineAt: FUTURE,
      deadlineBasis: 'publisher_stated',
    });
    const frozen = Object.freeze({ ...input });
    resolveStatus({ fetchOutcome: 'ok', evidence: input, ...base });
    expect({ ...input }).toEqual({ ...frozen });
  });

  it('C-5 es determinista', () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      results.add(JSON.stringify(resolveStatus({ fetchOutcome: 'ok', evidence: WOULD_BE_OPEN, ...base })));
    }
    expect(results.size).toBe(1);
  });

  it('C-6 sin fetch y sin contenido → UNKNOWN', () => {
    const r = resolveStatus({ fetchOutcome: 'timeout', evidence: evidence(), ...base });
    expect(r.status).toBe('UNKNOWN');
  });

  it('needsReview=false en los fallos transitorios esperados', () => {
    for (const outcome of ['http_5xx', 'rate_limited', 'circuit_open', 'budget_exhausted'] as const) {
      const r = resolveStatus({ fetchOutcome: outcome, evidence: WOULD_BE_OPEN, ...base });
      expect(r.needsReview).toBe(false);
    }
  });

  it('http_4xx es MEDIUM y sí pide revisión', () => {
    const r = resolveStatus({
      fetchOutcome: 'http_4xx',
      evidence: WOULD_BE_OPEN,
      httpStatus: 404,
      ...base,
    });
    expect(r.confidence).toBe('MEDIUM');
    expect(r.needsReview).toBe(true);
  });
});

describe('resolveStatus — Grupo D: propiedades sobre evidencia aleatoria', () => {
  const outcomes: SourceStatus[] = ['OPEN', 'UPCOMING', 'CLOSED', 'PAUSED', 'UNKNOWN'];
  const bases: DeadlineBasis[] = ['publisher_stated', 'inferred_from_cycle', 'unknown'];
  const dates: (Date | null)[] = [null, PAST, FUTURE, NOW];

  it('P1 CLOSED solo con flag explícito; P2 UNKNOWN siempre con reason; P4 fallos siempre UNKNOWN', () => {
    let iterations = 0;
    for (const outcome of FETCH_FAILURES) {
      for (const sourceStatus of outcomes) {
        for (const basis of bases) {
          for (const deadlineAt of dates) {
            const ev = evidence({
              sourceStatus,
              deadlineAt,
              deadlineBasis: basis,
              openingDate: '2026-01-01',
            });
            const r = resolveStatus({
              fetchOutcome: outcome,
              evidence: ev,
              now: NOW,
              readerTimeZone: 'UTC',
            });

            if (r.status === 'CLOSED') {
              expect(ev.sourceExplicitlySaysClosed).toBe(true);
            }
            if (r.status === 'UNKNOWN') {
              expect(r.reason.length).toBeGreaterThan(0);
            }
            expect(r.status).toBe('UNKNOWN');
            expect(r.preserveLastKnown).toBe(true);
            iterations += 1;
          }
        }
      }
    }
    expect(iterations).toBe(FETCH_FAILURES.length * 5 * 3 * 4);
  });

  it('ninguna combinación de éxito produce CLOSED sin evidencia explícita', () => {
    for (const sourceStatus of outcomes) {
      for (const basis of bases) {
        for (const deadlineAt of dates) {
          const r = resolveStatus({
            fetchOutcome: 'ok',
            evidence: evidence({
              sourceStatus,
              deadlineAt,
              deadlineBasis: basis,
              sourceExplicitlySaysClosed: false,
            }),
            now: NOW,
            readerTimeZone: 'UTC',
          });
          if (r.status === 'CLOSED') {
            expect(sourceStatus).toBe('CLOSED');
          }
          if (r.status === 'UNKNOWN') expect(r.reason).not.toBe('');
        }
      }
    }
  });
});
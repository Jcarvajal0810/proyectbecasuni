import { describe, expect, it } from 'vitest';
import { computeCountdown } from '../src/core/deadline/countdown';
import type { DeadlineBasis, DeadlinePrecision } from '../src/core/status/types';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const DEADLINE = new Date('2026-03-05T23:59:00.000Z');

function input(overrides: Record<string, unknown> = {}) {
  return {
    status: 'OPEN',
    deadlineAt: DEADLINE,
    deadlineBasis: 'publisher_stated' as DeadlineBasis,
    deadlinePrecision: 'DATE' as DeadlinePrecision,
    deadlineTz: 'UTC',
    now: NOW,
    isPublished: true,
    isDemo: false,
    deletedAt: null,
    ...overrides,
  };
}

describe('computeCountdown — las seis condiciones', () => {
  it('cuenta días naturales con precision DATE', () => {
    expect(computeCountdown(input()).days).toBe(4);
  });

  it('nunca devuelve 0 sobre un deadline vivo (el bug de R6)', () => {
    const twoHoursLeft = new Date('2026-03-01T23:59:00.000Z');
    const result = computeCountdown(input({ deadlineAt: twoHoursLeft }));
    expect(result.days).toBe(1);
    expect(result.days).not.toBe(0);
  });

  it('devuelve horas cuando la precisión es MINUTE', () => {
    const result = computeCountdown(
      input({ deadlinePrecision: 'MINUTE', deadlineAt: new Date('2026-03-01T18:30:00.000Z') }),
    );
    expect(result.hours).toBe(6);
    expect(result.days).toBeNull();
  });

  it('nunca devuelve 0 horas con minutos vivos restantes', () => {
    const in30min = new Date('2026-03-01T12:30:00.000Z');
    const result = computeCountdown(input({ deadlinePrecision: 'MINUTE', deadlineAt: in30min }));
    expect(result.hours).toBe(1);
    expect(result.hours).not.toBe(0);
  });

  it('formatea deadlineLocal en es-ES sin lanzar con zonas válidas', () => {
    const result = computeCountdown(input({ deadlineTz: 'America/Bogota' }));
    expect(result.deadlineLocal).toMatch(/2026/);
  });

  it.each([
    ['basis inferido', { deadlineBasis: 'inferred_from_cycle' as DeadlineBasis }],
    ['basis desconocido', { deadlineBasis: 'unknown' as DeadlineBasis }],
    ['precision desconocida', { deadlinePrecision: 'UNKNOWN' as DeadlinePrecision }],
    ['sin deadline', { deadlineAt: null }],
    ['sin zona', { deadlineTz: null }],
    ['deadline pasado', { deadlineAt: new Date('2026-02-01T00:00:00.000Z') }],
    ['estado CLOSED', { status: 'CLOSED' }],
    ['estado EXPIRED', { status: 'EXPIRED' }],
    ['estado UNKNOWN', { status: 'UNKNOWN' }],
    ['no publicado', { isPublished: false }],
    ['demo', { isDemo: true }],
    ['borrado', { deletedAt: NOW }],
    ['zona inválida', { deadlineTz: 'No/EsZona' }],
  ])('sin countdown: %s', (_label, overrides) => {
    const result = computeCountdown(input(overrides));
    expect(result.days).toBeNull();
    expect(result.hours).toBeNull();
  });

  it('cuenta en la zona del deadline, no en la del lector', () => {
    // 2026-03-05T23:30Z es 2026-03-06 en Tokyo (+09). La zona del deadline manda.
    const result = computeCountdown(
      input({ deadlineTz: 'Asia/Tokyo', deadlineAt: new Date('2026-03-05T23:30:00.000Z') }),
    );
    expect(result.days).toBe(5);
  });

  it('UPCOMING sí tiene countdown', () => {
    expect(computeCountdown(input({ status: 'UPCOMING' })).days).toBe(4);
  });
});
import { describe, expect, it } from 'vitest';
import {
  CRITICAL_AFTER_HOURS,
  STALE_AFTER_HOURS,
  ageHours,
  dataHealth,
  freshnessState,
  healthDegraded,
} from '../src/core/deadline/freshness';

/**
 * El fallo que esto cubre: un sync caído hace días y el sitio sigue
 * publicando la fecha de última verificación sin ninguna señal de que el
 * proceso se detuvo. Estos tests fijan los umbrales y, sobre todo, los casos
 * ambiguos donde un "verde" sería mentira.
 */
const NOW = new Date('2026-10-01T12:00:00Z');

function hoursAgo(h: number): string {
  return new Date(NOW.getTime() - h * 3_600_000).toISOString();
}

describe('freshnessState', () => {
  it.each([
    [0, 'fresh'],
    [1, 'fresh'],
    [STALE_AFTER_HOURS - 1, 'fresh'],
    [STALE_AFTER_HOURS, 'stale'],
    [48, 'stale'],
    [CRITICAL_AFTER_HOURS - 1, 'stale'],
    [CRITICAL_AFTER_HOURS, 'critical'],
    [24 * 30, 'critical'],
  ])('%i h de antigüedad → %s', (hours, expected) => {
    expect(freshnessState({ lastVerifiedAt: hoursAgo(hours), now: NOW })).toBe(expected);
  });

  it('unknown sin verificación previa', () => {
    expect(freshnessState({ lastVerifiedAt: null, now: NOW })).toBe('unknown');
  });

  it('unknown con timestamp ilegible', () => {
    expect(freshnessState({ lastVerifiedAt: 'no-es-una-fecha', now: NOW })).toBe('unknown');
  });

  it('unknown si el reloj del servidor va por detrás', () => {
    // Edad negativa significa reloj desincronizado o datos manipulados. En
    // ambos casos no sabemos nada, y tratarlo como "fresco" sería el peor
    // resultado posible: verde cuando no hay evidencia.
    expect(freshnessState({ lastVerifiedAt: hoursAgo(-5), now: NOW })).toBe('unknown');
  });
});

describe('ageHours', () => {
  it('redondea hacia arriba para no subestimar la antigüedad', () => {
    // 1 min 1 s de antigüedad son 2 horas redondeadas: mostrar "0 h" sobre un
    // corpus de 90 minutos sugeriría verificación recién hecha.
    const justOver = new Date(NOW.getTime() - (3_600_000 + 1)).toISOString();
    expect(ageHours(justOver, NOW)).toBe(2);
  });

  it('null sin datos utilizables', () => {
    expect(ageHours(null, NOW)).toBeNull();
    expect(ageHours('basura', NOW)).toBeNull();
  });
});

describe('healthDegraded', () => {
  it('degradado cuando el corpus está crítico', () => {
    const health = dataHealth({ published: 180, lastVerifiedAt: hoursAgo(96) }, NOW);
    expect(health.state).toBe('critical');
    expect(healthDegraded(health)).toBe(true);
  });

  it('degradado si nunca se sincronizó, aunque el corpus tenga filas', () => {
    // Sin ninguna verificación no hay evidencia de frescura. Un corpus con
    // datos pero jamás verificado no puede darse por bueno.
    const health = dataHealth({ published: 5, lastVerifiedAt: null }, NOW);
    expect(health.state).toBe('unknown');
    expect(healthDegraded(health)).toBe(true);
  });

  it('degradado con corpus vacío aunque diga fresco', () => {
    // El caso del seed que nunca corrió: sin filas no hay nada que verificar,
    // así que "fresh" sobre 0 registros es un verde falso.
    const health = dataHealth({ published: 0, lastVerifiedAt: hoursAgo(1) }, NOW);
    expect(healthDegraded(health)).toBe(true);
  });

  it('sano con datos recientes', () => {
    const health = dataHealth({ published: 180, lastVerifiedAt: hoursAgo(3) }, NOW);
    expect(health.state).toBe('fresh');
    expect(healthDegraded(health)).toBe(false);
  });
});

describe('dataHealth', () => {
  it('expone la edad para el log', () => {
    const health = dataHealth({ published: 180, lastVerifiedAt: hoursAgo(5) }, NOW);
    expect(health.ageHours).toBe(5);
    expect(health.lastVerifiedAt).toBe(hoursAgo(5));
    expect(health.staleAfterHours).toBe(STALE_AFTER_HOURS);
  });
});
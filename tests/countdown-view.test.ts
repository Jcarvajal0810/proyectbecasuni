import { describe, expect, it } from 'vitest';
import { countdownFromView } from '../src/core/deadline/countdown';

/**
 * La vista `v_scholarships_public` entrega `countdown_raw` en SEGUNDOS para
 * MINUTE/HOUR y en DÍAS para DATE. Los componentes no deben reinterpretar ese
 * número: ya estuvo roto (dividir segundos entre 3_600_000 devolvía siempre
 * "1 h"), y un countdown falso es peor que un countdown ausente.
 */
describe('countdownFromView', () => {
  it.each([
    [7_199, 1], // 1 h 59 min 59 s → 1 h, nunca 0
    [3_600, 1],
    [7_199_999, 1999],
    [1, 1], // 1 segundo restante → 1 h
  ])('%i segundos → %i horas', (seconds, hours) => {
    expect(countdownFromView(seconds, 'MINUTE')).toEqual({ days: null, hours });
    expect(countdownFromView(seconds, 'HOUR')).toEqual({ days: null, hours });
  });

  it.each([
    [0, 1],
    [1, 1],
    [14, 14],
    [365, 365],
  ])('%i días → %i días', (days, expected) => {
    expect(countdownFromView(days, 'DATE')).toEqual({ days: expected, hours: null });
  });

  it('sin countdown cuando la vista no trae valor', () => {
    expect(countdownFromView(null, 'DATE')).toEqual({ days: null, hours: null });
    expect(countdownFromView(null, 'HOUR')).toEqual({ days: null, hours: null });
  });

  it('UNKNOWN no produce countdown en vez de un 0', () => {
    expect(countdownFromView(9_999, 'UNKNOWN')).toEqual({ days: null, hours: null });
  });

  it('un NaN coming del driver no se filtra a la UI', () => {
    expect(countdownFromView(Number.NaN, 'DATE')).toEqual({ days: null, hours: null });
  });

  it('nunca devuelve 0 con valor presente', () => {
    for (const raw of [0, 1, 60, 3_599]) {
      expect(countdownFromView(raw, 'HOUR').hours).not.toBe(0);
      expect(countdownFromView(raw, 'DATE').days).not.toBe(0);
    }
  });
});
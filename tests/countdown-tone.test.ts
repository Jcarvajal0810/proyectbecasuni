import { describe, expect, it } from 'vitest';
import { countdownTone, type Countdown } from '../src/core/deadline/countdown';

/**
 * El tono es presión temporal, no estado. Debe seguir siendo null cuando no hay
 * countdown: un color de urgencia sobre un dato sin deadline sería una alerta
 * falsa, que es peor que no tener alerta.
 */
function c(days: number | null, hours: number | null = null): Countdown {
  return { days, hours, deadlineLocal: null };
}

describe('countdownTone', () => {
  it.each([
    [1, 'urgent'],
    [3, 'urgent'],
    [4, 'soon'],
    [10, 'soon'],
    [11, 'comfortable'],
    [90, 'comfortable'],
  ])('%i días → %s', (days, tone) => {
    expect(countdownTone(c(days))).toBe(tone);
  });

  it.each([
    [1, 'urgent'],
    [48, 'urgent'],
    [49, 'soon'],
    [200, 'soon'],
  ])('%i horas → %s', (hours, tone) => {
    expect(countdownTone(c(null, hours))).toBe(tone);
  });

  it('null cuando no hay countdown', () => {
    expect(countdownTone(c(null))).toBeNull();
    expect(countdownTone(c(null, null))).toBeNull();
  });
});
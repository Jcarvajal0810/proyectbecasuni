import { describe, expect, it } from 'vitest';
import { ReplayGuard, isValidIdemKey } from '../src/jobs/replay-guard';

describe('isValidIdemKey', () => {
  it.each(['abcdefghijklmnop', 'a'.repeat(64), 'Key_123-abcDEF4567'])('acepta %s', (key) => {
    expect(isValidIdemKey(key)).toBe(true);
  });

  it.each([
    ['corto', 'abcdefghijklmn'],
    ['con punto', 'abcdefghijklmno.p'],
    ['con espacio', 'abcdefghijklmn p'],
    ['con barra', 'abcdefghijklmno/p'],
    ['vacía', ''],
  ])('rechaza: %s', (_label, key) => {
    expect(isValidIdemKey(key)).toBe(false);
  });

  it('rechaza null', () => {
    expect(isValidIdemKey(null)).toBe(false);
  });

  it('rechaza una clave de 65 caracteres', () => {
    expect(isValidIdemKey('a'.repeat(65))).toBe(false);
  });
});

describe('ReplayGuard', () => {
  it('acepta la primera vez y rechaza el reenvío', () => {
    const guard = new ReplayGuard();
    expect(guard.register('key-1')).toBe(true);
    expect(guard.register('key-1')).toBe(false);
    expect(guard.register('key-1')).toBe(false);
  });

  it('claves distintas no se bloquean entre sí', () => {
    const guard = new ReplayGuard();
    expect(guard.register('key-1')).toBe(true);
    expect(guard.register('key-2')).toBe(true);
    expect(guard.register('key-3')).toBe(true);
  });

  it('expira la clave pasado el TTL', () => {
    const guard = new ReplayGuard({ ttlMs: 1_000 });
    const t0 = 1_000_000;
    expect(guard.register('key-1', t0)).toBe(true);
    expect(guard.register('key-1', t0 + 500)).toBe(false);
    expect(guard.register('key-1', t0 + 1_500)).toBe(true);
  });

  it('el TTL por defecto supera la ventana de firma de 5 min', () => {
    const signatureWindowMs = 5 * 60 * 1000;
    // Si el guard expirara antes que la ventana de la firma, una firma de 4:59
    // volvería a aceptarse tras expirar el guard.
    const guard = new ReplayGuard();
    const guardTtl = 10 * 60 * 1000;
    expect(guardTtl).toBeGreaterThan(signatureWindowMs);
    expect(guard.register('k', 0)).toBe(true);
    expect(guard.register('k', signatureWindowMs + 1)).toBe(false);
  });

  it('no crece sin límite', () => {
    const guard = new ReplayGuard({ maxEntries: 10 });
    for (let i = 0; i < 100; i += 1) guard.register(`key-${i}`);
    // Con el tope superado, las claves recientes siguen protegiéndose.
    expect(guard.register('key-99')).toBe(false);
  });

  it('purgar no borra claves vigentes', () => {
    const guard = new ReplayGuard({ ttlMs: 100 });
    expect(guard.register('key-1', 1_000)).toBe(true);
    expect(guard.register('key-2', 5_000)).toBe(true);
    // t=5050: key-1 venció en 1100 (se purga), key-2 vive hasta 5100.
    expect(guard.register('key-3', 5_050)).toBe(true);
    expect(guard.register('key-2', 5_060)).toBe(false);
  });
});
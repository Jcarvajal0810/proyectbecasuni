import { describe, expect, it } from 'vitest';
import { signJobPayload, verifyJobSignature } from '../src/jobs/auth';

const BODY = JSON.stringify({ source: 'eacea' });
const KEY = 'idemKey_ABC123456';

describe('auth de jobs (HMAC + idempotencia)', () => {
  it('falla cerrado sin secreto: nunca hay bypass de desarrollo', () => {
    const previous = process.env.JOB_HMAC_SECRET;
    delete process.env.JOB_HMAC_SECRET;
    expect(() => signJobPayload(BODY, KEY)).toThrow(/JOB_HMAC_SECRET/);
    if (previous !== undefined) process.env.JOB_HMAC_SECRET = previous;
  });

  it('rechaza ausencia y malformed', () => {
    process.env.JOB_HMAC_SECRET = 'test-secret-largo-suficiente';
    expect(verifyJobSignature(null, BODY, KEY)).toMatchObject({ ok: false, reason: 'missing' });
    expect(verifyJobSignature('', BODY, KEY)).toMatchObject({ ok: false, reason: 'missing' });
    expect(verifyJobSignature('abc', BODY, KEY)).toMatchObject({ ok: false, reason: 'malformed' });
    expect(verifyJobSignature('notanumber.k.abc', BODY, KEY)).toMatchObject({
      ok: false,
      reason: 'malformed',
    });
  });

  it('acepta una firma válida dentro de la ventana', () => {
    process.env.JOB_HMAC_SECRET = 'test-secret-largo-suficiente';
    const signature = signJobPayload(BODY, KEY);
    const result = verifyJobSignature(signature, BODY, KEY);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.idemKey).toBe(KEY);
  });

  it('rechaza una firma de otro cuerpo', () => {
    process.env.JOB_HMAC_SECRET = 'test-secret-largo-suficiente';
    const signature = signJobPayload(BODY, KEY);
    expect(verifyJobSignature(signature, JSON.stringify({ source: 'otro' }), KEY)).toMatchObject({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('rechaza una firma expirada más allá de 5 minutos', () => {
    process.env.JOB_HMAC_SECRET = 'test-secret-largo-suficiente';
    const old = Date.now() - 10 * 60 * 1000;
    const signature = signJobPayload(BODY, KEY, old);
    expect(verifyJobSignature(signature, BODY, KEY)).toMatchObject({ ok: false, reason: 'expired' });
  });

  it('rechaza una firma made con otro secreto', () => {
    process.env.JOB_HMAC_SECRET = 'secreto-a';
    const signature = signJobPayload(BODY, KEY);
    process.env.JOB_HMAC_SECRET = 'secreto-b';
    expect(verifyJobSignature(signature, BODY, KEY)).toMatchObject({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('rechaza cambiar la idem key en la cabecera', () => {
    process.env.JOB_HMAC_SECRET = 'test-secret-largo-suficiente';
    const signature = signJobPayload(BODY, KEY);
    // Si la cabecera no se validara contra el HMAC, cambiar el idem key evitaría
    // el guard de replay manteniendo una firma válida.
    expect(verifyJobSignature(signature, BODY, 'otraIdemKeyXYZ_9')).toMatchObject({
      ok: false,
      reason: 'bad_idem_key',
    });
  });

  it('rechaza una idem key ausente en la cabecera', () => {
    process.env.JOB_HMAC_SECRET = 'test-secret-largo-suficiente';
    const signature = signJobPayload(BODY, KEY);
    expect(verifyJobSignature(signature, BODY, null)).toMatchObject({
      ok: false,
      reason: 'bad_idem_key',
    });
  });

  it('la firma cambia si cambia la idem key', () => {
    process.env.JOB_HMAC_SECRET = 'test-secret-largo-suficiente';
    const a = signJobPayload(BODY, KEY, 1_000_000);
    const b = signJobPayload(BODY, 'otraIdemKeyXYZ_9', 1_000_000);
    expect(a.split('.')[2]).not.toBe(b.split('.')[2]);
  });

  it('firma no acepta una idem key malformada', () => {
    process.env.JOB_HMAC_SECRET = 'test-secret-largo-suficiente';
    expect(() => signJobPayload(BODY, 'corta')).toThrow(/idemKey/);
    expect(() => signJobPayload(BODY, 'con.punto.que.se.pasa')).toThrow(/idemKey/);
  });
});
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { verifyCronSecret } from '../src/jobs/cron-auth';

/**
 * El cron de Vercel no puede firmar HMAC: solo manda `Authorization: Bearer …`.
 * Esta ruta sustituye a la firma por un secreto comparado en tiempo constante.
 * Lo crítico es que falle cerrado — un endpoint de sync con bypass en dev
 * acaba desplegándose sin la variable puesta.
 */
const ORIGINAL = process.env.CRON_SECRET;

beforeEach(() => {
  process.env.CRON_SECRET = 'a'.repeat(43);
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL;
});

describe('verifyCronSecret', () => {
  it('acepta el bearer correcto', () => {
    expect(verifyCronSecret(`Bearer ${'a'.repeat(43)}`)).toEqual({ ok: true });
  });

  it('503 sin secreto configurado, no 401', () => {
    delete process.env.CRON_SECRET;
    // 503 = configuración ausente (separable en alertas). 401 = alguien
    // intentó entrar. Confundirlos haría imposible distinguir un despliegue mal
    // configurado de un intento de acceso.
    expect(verifyCronSecret(`Bearer ${'a'.repeat(43)}`)).toEqual({
      ok: false,
      status: 503,
    });
  });

  it('503 con secreto vacío', () => {
    process.env.CRON_SECRET = '';
    expect(verifyCronSecret('Bearer x').ok).toBe(false);
  });

  it('rechaza cabecera ausente', () => {
    expect(verifyCronSecret(null)).toEqual({ ok: false, status: 401 });
  });

  it('rechaza cabecera vacía', () => {
    expect(verifyCronSecret('')).toEqual({ ok: false, status: 401 });
  });

  it('rechaza sin prefijo Bearer', () => {
    expect(verifyCronSecret('a'.repeat(43))).toEqual({ ok: false, status: 401 });
  });

  it('rechaza esquema en minúsculas', () => {
    expect(verifyCronSecret(`bearer ${'a'.repeat(43)}`).ok).toBe(false);
  });

  it('rechaza el secreto correcto con prefijo de longitud distinta', () => {
    expect(verifyCronSecret(`Bearer ${'a'.repeat(42)}`).ok).toBe(false);
    expect(verifyCronSecret(`Bearer ${'a'.repeat(44)}`).ok).toBe(false);
  });

  it('rechaza un secreto distinto de la misma longitud', () => {
    expect(verifyCronSecret(`Bearer ${'b'.repeat(43)}`)).toEqual({ ok: false, status: 401 });
  });

  it('rechaza el secreto con espacios alrededor', () => {
    // Sin `trim`: un secreto con espacios es un error de configuración que debe
    // manifestarse, no algo que se compense por sorpresa.
    expect(verifyCronSecret(`Bearer  ${'a'.repeat(43)} `).ok).toBe(false);
  });

  it('no filtra el secreto por longitud en la respuesta', () => {
    // Todas las entradas incorrectas dan el mismo resultado, sea cual sea la
    // longitud: el atacante no puede usar el status para medir intentos.
    const short = verifyCronSecret('Bearer abc');
    const long = verifyCronSecret(`Bearer ${'a'.repeat(200)}`);
    expect(short).toEqual(long);
  });
});
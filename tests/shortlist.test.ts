import { describe, expect, it } from 'vitest';
import {
  generateToken,
  hashToken,
  tokensMatch,
  validateSlug,
  SHORTLIST_LIMIT,
} from '../src/shortlist/shortlist';

describe('tokens de shortlist', () => {
  it('genera tokens de 256 bits de entropía', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43); // base64url de 32 bytes
    expect(Buffer.from(a, 'base64url')).toHaveLength(32);
  });

  it('el token nunca se guarda en claro: el hash es de 64 hex', () => {
    const token = generateToken();
    const hash = hashToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
  });

  it('el hash es determinista', () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('tokensMatch distingue dos tokens distintos', () => {
    expect(tokensMatch(generateToken(), generateToken())).toBe(false);
  });

  it('tokensMatch acepta el mismo token', () => {
    const token = generateToken();
    expect(tokensMatch(token, token)).toBe(true);
  });
});

describe('validateSlug', () => {
  it.each(['master-verificacion-deja-diez-dias', 'abc-123', 'a'])('acepta %s', (slug) => {
    expect(validateSlug(slug)).toBe(true);
  });

  it.each([
    ['con mayúsculas', 'Master-ABC'],
    ['con barra', 'abc/../otro'],
    ['con espacio', 'abc def'],
    ['con query', 'abc?x=1'],
    ['vacío', ''],
    ['no string', 42],
    ['null', null],
    ['demasiado largo', 'a'.repeat(121)],
  ])('rechaza: %s', (_label, slug) => {
    expect(validateSlug(slug as unknown)).toBe(false);
  });
});

describe('límite de shortlist', () => {
  it('existe un tope duro', () => {
    expect(SHORTLIST_LIMIT).toBeGreaterThan(0);
    expect(SHORTLIST_LIMIT).toBeLessThanOrEqual(500);
  });
});
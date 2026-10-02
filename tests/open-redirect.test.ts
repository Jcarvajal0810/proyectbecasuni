import { describe, expect, it } from 'vitest';
import { safeReturnTo } from '../src/app/api/locale/route';

/**
 * Un redirector abierto en el cambio de idioma permite phishing con un enlace
 * legítimo del propio dominio. Los tests cubren las variantes que un chequeo
 * ingenuo (`startsWith('/') && !startsWith('//')`) deja pasar.
 */
describe('safeReturnTo — rutas internas permitidas', () => {
  it.each(['/', '/becas', '/becas/abc123', '/es/becas?q=upc', '/fuentes#methodology'])(
    'acepta %s',
    (path) => {
      expect(safeReturnTo(path)).toBe(path);
    },
  );
});

describe('safeReturnTo — open redirect bloqueado', () => {
  it.each([
    '//evil.com',
    '//evil.com/path',
    '///evil.com',
    '/\\evil.com',
    '/\\/evil.com',
    '\\\\evil.com',
    'https://evil.com',
    'http://evil.com/becas',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'evil.com',
    '',
  ])('rechaza %s y cae en /', (path) => {
    expect(safeReturnTo(path)).toBe('/');
  });

  it('normaliza barras invertidas en una ruta interna legítima', () => {
    expect(safeReturnTo('/becas\\abc')).toBe('/becas/abc');
  });

  it('rechaza entradas que no son string', () => {
    expect(safeReturnTo(null)).toBe('/');
    expect(safeReturnTo(undefined)).toBe('/');
    expect(safeReturnTo(42)).toBe('/');
    expect(safeReturnTo(['/becas'])).toBe('/');
  });

  it('impide payloads largos', () => {
    expect(safeReturnTo(`/${'a'.repeat(500)}`)).toBe('/');
  });

  it('acepta una ruta larga pero razonable', () => {
    const path = `/${'a'.repeat(150)}`;
    expect(safeReturnTo(path)).toBe(path);
  });
});
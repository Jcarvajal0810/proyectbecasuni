import { describe, expect, it } from 'vitest';
import { buildCsp } from '../src/proxy';

/**
 * La CSP es una promesa de seguridad solo si es irrompible por descuido.
 * Estos tests fijan dos cosas: que `unsafe-eval` no aparece en producción, y que
 * ninguna directiva de la baseline se relaja silenciosamente.
 */

function directive(csp: string, name: string): string | null {
  const match = new RegExp(`(?:^|; )${name}\\s+([^;]+)`).exec(csp);
  return match?.[1]?.trim() ?? null;
}

describe('CSP — producción', () => {
  const csp = buildCsp('NONCE_PLACEHOLDER', false);

  it('nunca permite unsafe-eval', () => {
    expect(csp).not.toContain('unsafe-eval');
  });

  it('nunca permite unsafe-inline en script-src', () => {
    expect(directive(csp, 'script-src')).not.toContain('unsafe-inline');
  });

  it('el script solo se ejecuta con el nonce', () => {
    const script = directive(csp, 'script-src');
    expect(script).toContain("'nonce-NONCE_PLACEHOLDER'");
    expect(script).toContain("'strict-dynamic'");
  });

  it('exige Trusted Types para cerrar el DOM-XSS residual', () => {
    expect(directive(csp, 'require-trusted-types-for')).toBe("'script'");
    expect(directive(csp, 'trusted-types')).not.toBeNull();
  });

  it('mantiene las directivas de la baseline sin relajar', () => {
    expect(directive(csp, 'default-src')).toBe("'self'");
    expect(directive(csp, 'object-src')).toBe("'none'");
    expect(directive(csp, 'base-uri')).toBe("'none'");
    expect(directive(csp, 'frame-ancestors')).toBe("'none'");
    expect(directive(csp, 'frame-src')).toBe("'none'");
    expect(directive(csp, 'form-action')).toBe("'self'");
    expect(directive(csp, 'connect-src')).toBe("'self'");
  });

  it('el nonce se propaga a la cabecera', () => {
    expect(csp).toContain("'nonce-NONCE_PLACEHOLDER'");
  });
});

describe('CSP — desarrollo', () => {
  it('permite unsafe-eval en script-src para React Refresh', () => {
    expect(directive(buildCsp('N', true), 'script-src')).toContain('unsafe-eval');
  });

  it('sigue sin permitir unsafe-inline en script-src ni en dev', () => {
    const csp = buildCsp('N', true);
    expect(directive(csp, 'script-src')).not.toContain('unsafe-inline');
  });
});

describe('CSP — estructura', () => {
  it('no deja directivas duplicadas', () => {
    const names = buildCsp('N', false)
      .split(';')
      .map((part) => part.trim().split(/\s+/)[0])
      .filter((v) => v !== undefined && v !== '');
    expect(new Set(names).size).toBe(names.length);
  });

  it('no termina con punto y coma colgante ni separadores dobles', () => {
    const csp = buildCsp('N', false);
    expect(csp).not.toMatch(/;\s*;/);
    expect(csp.endsWith(';')).toBe(false);
  });
});
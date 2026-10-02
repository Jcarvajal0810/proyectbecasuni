import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * AR-12: el layering solo funciona si es verificable. `core/` no puede importar
 * `adapters/`, `db/`, `fetch/` ni `next/*`. Esta regla es lo que hace que la
 * pureza de `resolveStatus()` sea una propiedad comprobable y no una promesa.
 */

const ROOT = process.cwd();
const CORE = join(ROOT, 'src', 'core');
const FORBIDDEN = ['adapters', 'db', 'fetch', 'next/', 'node:fs', 'node:http'];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/**
 * Elimina comentarios y literales de plantilla antes de escanear: un check de
 * pureza sobre el código real, no sobre la prosa que *habla* de la prohibición
 * (el propio docblock de resolveStatus la menciona).
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

describe('architecture — purity of core/', () => {
  const files = walk(CORE);

  it('core/ tiene archivos que verificar', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const name = relative(ROOT, file).split(sep).join('/');
    it(`${name} no importa fuera de core/`, () => {
      const source = stripComments(readFileSync(file, 'utf8'));
      const importPattern = /(?:^|\n)\s*(?:import|export)[^;]*?from\s+['"]([^'"]+)['"]/g;
      const barePattern = /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g;
      const specifiers: string[] = [];

      for (const match of source.matchAll(importPattern)) {
        if (match[1] !== undefined) specifiers.push(match[1]);
      }
      for (const match of source.matchAll(barePattern)) {
        if (match[1] !== undefined) specifiers.push(match[1]);
      }

      for (const specifier of specifiers) {
        // Relative imports dentro de core/ y el alias @/core/ son legítimos.
        const relativeOk = specifier.startsWith('./') || specifier.startsWith('../');
        const coreAlias = specifier.startsWith('@/core/');
        if (relativeOk || coreAlias) continue;

        for (const forbidden of FORBIDDEN) {
          expect(
            specifier.includes(forbidden),
            `${name} importa "${specifier}", que viola la pureza de core/ (AR-12)`,
          ).toBe(false);
        }
      }
    });
  }

  it('resolveStatus.ts no lee el reloj: sin Date.now, new Date ni Math.random', () => {
    const code = stripComments(
      readFileSync(join(CORE, 'status', 'resolve-status.ts'), 'utf8'),
    );
    expect(code).not.toContain('Date.now');
    expect(code).not.toContain('new Date');
    expect(code).not.toContain('Math.random');
  });

  it('el contexto now es obligatorio en la entrada de resolveStatus', () => {
    const source = readFileSync(join(CORE, 'status', 'types.ts'), 'utf8');
    expect(source).toMatch(/readonly now: Date/);
  });
});

describe('architecture — la frontera de fetch es la única salida', () => {
  const adapters = walk(join(ROOT, 'src', 'adapters'));

  it('ningún adapter hace fetch directo: debe pasar por SafeHttpClient', () => {
    for (const file of adapters) {
      if (file.endsWith('adapter.ts') && file.includes('eacea')) {
        const code = stripComments(readFileSync(file, 'utf8'));
        expect(code).not.toMatch(/[^.\w]fetch\s*\(/);
      }
    }
  });
});
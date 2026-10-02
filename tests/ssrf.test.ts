import { describe, expect, it } from 'vitest';
import { checkAllowlist, isBlockedIp } from '../src/fetch/allowlist';

/**
 * Tests negativos de SSRF. Bloquean el build si alguien relaja la frontera de
 * fetch (security-baseline §6.3).
 */

describe('allowlist — esquemas', () => {
  it('permite el feed EACEA por HTTPS', () => {
    const decision = checkAllowlist('https://www.eacea.ec.europa.eu/node/253/rss_en');
    expect(decision.allowed).toBe(true);
  });

  it.each([
    'http://www.eacea.ec.europa.eu/node/253/rss_en',
    'file:///etc/passwd',
    'gopher://www.eacea.ec.europa.eu:70/x',
    'data:text/html,<script>alert(1)</script>',
    'ftp://www.eacea.ec.europa.eu/node/253/rss_en',
  ])('bloquea el esquema no permitido: %s', (url) => {
    const decision = checkAllowlist(url);
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toBe('blocked_scheme');
  });
});

describe('allowlist — hosts', () => {
  it.each([
    'https://evil.com/node/253/rss_en',
    'https://www.eacea.ec.europa.eu.evil.com/node/253/rss_en',
    'https://eacea.ec.europa.eu/node/253/rss_en',
    'https://localhost/node/253/rss_en',
    'https://169.254.169.254/latest/meta-data/',
    'https://metadata.google.internal/computeMetadata/v1/',
  ])('bloquea el host no allowlisted: %s', (url) => {
    const decision = checkAllowlist(url);
    expect(decision.allowed).toBe(false);
  });

  it('bloquea puertos no estándar sobre un host válido', () => {
    const decision = checkAllowlist('https://www.eacea.ec.europa.eu:8443/node/253/rss_en');
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toBe('blocked_host');
  });

  it('permite el puerto 443 explícito', () => {
    expect(checkAllowlist('https://www.eacea.ec.europa.eu:443/node/253/rss_en').allowed).toBe(true);
  });
});

describe('allowlist — rutas', () => {
  it.each([
    'https://www.eacea.ec.europa.eu/',
    'https://www.eacea.ec.europa.eu/admin',
    'https://www.eacea.ec.europa.eu/node/999/rss_en',
    'https://www.eacea.ec.europa.eu/node/253/rss_en/../../admin',
  ])('bloquea la ruta fuera del prefijo: %s', (url) => {
    expect(checkAllowlist(url).allowed).toBe(false);
  });

  it('no acepta un URL malformado', () => {
    expect(checkAllowlist('no-es-un-url').allowed).toBe(false);
  });
});

describe('isBlockedIp — bloqueo de rangos', () => {
  it.each([
    '127.0.0.1',
    '127.1.2.3',
    '10.0.0.5',
    '172.16.0.1',
    '172.31.255.254',
    '192.168.1.1',
    '169.254.169.254',
    '0.0.0.0',
    '100.64.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::1',
    '::',
    'fe80::1',
    'fd00::1',
    '::ffff:127.0.0.1',
  ])('bloquea la IP privada o reservada: %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each(['93.184.216.34', '8.8.8.8', '1.1.1.1', '2606:2800:220:1:248:1893:25c8:1946'])(
    'permite la IP pública: %s',
    (ip) => {
      expect(isBlockedIp(ip)).toBe(false);
    },
  );
});
import { describe, expect, it } from 'vitest';
import { checkAllowlist, isBlockedIp } from '../src/fetch/allowlist';

/** Vectores que un filtro ingenuo deja pasar y que `isBlockedIp` debe cerrar. */
describe('isBlockedIp — IPv4-mapped y encapsulados', () => {
  it.each([
    ['::ffff:7f00:1', true],
    ['::ffff:a00:1', true],
    ['::ffff:c0a8:101', true],
    ['::ffff:a9fe:a9fe', true],
    ['64:ff9b::7f00:1', true],
    ['2002:7f00:1::', true],
    ['2002:a00:1::', true],
    ['2001:0:0::1', true],
    ['ff02::1', true],
    ['100::1', true],
    ['2001:db8::1', true],
    ['::ffff:172.16.0.1', true],
    ['::ffff:172.32.0.1', false],
  ])('%s → %s', (ip, expected) => {
    expect(isBlockedIp(ip)).toBe(expected);
  });
});

describe('isBlockedIp — fail closed', () => {
  it.each(['no-es-una-ip', '', '999.999.999.999', '1.2.3', '::gg', 'localhost'])(
    'bloquea la entrada no parseable: %s',
    (input) => {
      expect(isBlockedIp(input)).toBe(true);
    },
  );
});

describe('isBlockedIp — fronteras exactas', () => {
  it('no bloquea IPs públicas', () => {
    expect(isBlockedIp('8.8.8.8')).toBe(false);
    expect(isBlockedIp('1.1.1.1')).toBe(false);
    expect(isBlockedIp('93.184.216.34')).toBe(false);
  });

  it('respeta la frontera exacta de 172.16/12', () => {
    expect(isBlockedIp('172.15.255.255')).toBe(false);
    expect(isBlockedIp('172.16.0.0')).toBe(true);
    expect(isBlockedIp('172.31.255.255')).toBe(true);
    expect(isBlockedIp('172.32.0.0')).toBe(false);
  });

  it('acepta IPv6 global 2001:4860 (no es Teredo)', () => {
    expect(isBlockedIp('2001:4860:4860::8888')).toBe(false);
  });
});

describe('checkAllowlist — normalización', () => {
  it('acepta mayúsculas en el host', () => {
    expect(checkAllowlist('HTTPS://WWW.EACEA.EC.EUROPA.EU/node/253/rss_en').allowed).toBe(true);
  });

  it('rechaza credenciales embebidas en la URL', () => {
    expect(
      checkAllowlist('https://user:pass@www.eacea.ec.europa.eu/node/253/rss_en').allowed,
    ).toBe(false);
  });

  it('admite query y fragmento sin cambiar la decisión', () => {
    expect(checkAllowlist('https://www.eacea.ec.europa.eu/node/253/rss_en?a=1').allowed).toBe(
      true,
    );
    expect(checkAllowlist('https://www.eacea.ec.europa.eu/node/253/rss_en#x').allowed).toBe(true);
  });

  it('el prefijo de ruta no acepta el hermano por recentitud', () => {
    // /node/2530/... empieza por /node/253 con un startsWith ingenuo.
    expect(checkAllowlist('https://www.eacea.ec.europa.eu/node/2530/rss_en').allowed).toBe(false);
  });
});
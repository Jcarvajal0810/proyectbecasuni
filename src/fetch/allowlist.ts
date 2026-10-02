/**
 * Allowlist de destinos del pipeline de sync (security-baseline §6.3).
 *
 * Allowlist **exacta**, no de dominio: cada origen permitted nombra su host y
 * su conjunto de rutas. Un subdominio nuevo no entra por comodín.
 */

export type AllowedOrigin = {
  readonly sourceId: string;
  readonly host: string;
  /** Prefijos de ruta permitidos. Una URL debe empezar por alguno. */
  readonly pathPrefixes: readonly string[];
  readonly schemes: readonly ('https:')[];
};

export const ALLOWED_ORIGINS: readonly AllowedOrigin[] = [
  {
    sourceId: 'eacea',
    host: 'www.eacea.ec.europa.eu',
    pathPrefixes: ['/node/253/rss_en'],
    schemes: ['https:'],
  },
];

const BY_HOST = new Map(ALLOWED_ORIGINS.map((o) => [o.host, o]));

export type AllowlistDecision =
  | { readonly allowed: true; readonly origin: AllowedOrigin }
  | {
      readonly allowed: false;
      readonly reason: 'blocked_scheme' | 'blocked_host' | 'redirect_violation';
    };

/**
 * Decide si una URL es un destino permitido.
 *
 * El orden importa: primero el esquema (evitar `file:`, `gopher:`, `data:`),
 * después el host exacto, después el prefijo de ruta.
 */
export function checkAllowlist(rawUrl: string): AllowlistDecision {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: 'blocked_scheme' };
  }

  if (!url.protocol.startsWith('https')) {
    return { allowed: false, reason: 'blocked_scheme' };
  }

  // Los puertos no estándar son la vía clásica para saltar la allowlist.
  if (url.port !== '' && url.port !== '443') {
    return { allowed: false, reason: 'blocked_host' };
  }

  // Credenciales en la URL: el host seguiría siendo el correcto, así que el
  // chequeo de host no las detecta. Son phishing y fuga de secretos.
  if (url.username !== '' || url.password !== '') {
    return { allowed: false, reason: 'blocked_host' };
  }

  const origin = BY_HOST.get(url.hostname);
  if (origin === undefined) {
    return { allowed: false, reason: 'blocked_host' };
  }

  // El prefijo debe terminar en un límite de segmento: sin esto,
  // `/node/2530/rss_en` passería por empezar con `/node/253`.
  const matchesPath = origin.pathPrefixes.some((prefix) => {
    if (!url.pathname.startsWith(prefix)) return false;
    const rest = url.pathname.slice(prefix.length);
    return rest === '' || rest.startsWith('/') || rest.startsWith('?');
  });
  if (!matchesPath) {
    return { allowed: false, reason: 'redirect_violation' };
  }

  return { allowed: true, origin };
}

/** Rangos que nunca deben resolverse, aunque un host de la allowlist los apunte. */
const BLOCKED_IPV4_RANGES: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    value = value * 256 + n;
  }
  return value;
}

function baseToInt(base: string): number | null {
  const [a, b, c] = base.split('.').map(Number);
  if (a === undefined || b === undefined || c === undefined) return null;
  return a * 256 * 256 * 256 + b * 256 * 256 + c * 256;
}

/**
 * `true` si la IP es privada, de loopback, link-local, CGNAT, multicast,
 * reservada o de documentación. Cubre el bypass por DNS rebinding.
 *
 * Ante una IP que no se puede parsear devuelve `true` (fail closed): una
 * comprobación de seguridad que dice "no sé" y responde "permitido" no es una
 * comprobación de seguridad.
 */
export function isBlockedIp(ip: string): boolean {
  const v4 = ipv4ToInt(ip);
  if (v4 !== null) return isBlockedIpv4(v4);

  const b = ipv6ToBytes(ip);
  if (b === null) return true;

  // ::/128 y ::1/128
  const allZero = b.every((byte) => byte === 0);
  if (allZero) return true;
  if (b.slice(0, 15).every((byte) => byte === 0) && b[15] === 1) return true;

  // ::ffff:0:0/96 y 64:ff9b::/96 — IPv4 mapeado / NAT64. Si el IPv4 incrustado
  // es privado, la dirección también lo es. Sin esto, `::ffff:7f00:1` (la
  // forma hexadecimal de ::ffff:127.0.0.1) sería un bypass directo.
  if (hasPrefix(b, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff], 96)) {
    return isBlockedIpv4(be32(b, 12));
  }
  if (hasPrefix(b, [0x00, 0x64, 0xff, 0x9b, 0, 0, 0, 0, 0, 0, 0, 0], 96)) {
    return isBlockedIpv4(be32(b, 12));
  }

  // 2002::/16 (6to4) incrusta un IPv4 en los bytes 2..5.
  if (b[0] === 0x20 && b[1] === 0x02) return isBlockedIpv4(be32(b, 2));

  // 2001:0000::/32 (Teredo) — solo el /32 exacto; 2001:4860::/32 (Google DNS)
  // queda intacto porque su segundo grupo no es cero.
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) return true;

  // 2001:db8::/32 documentación
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return true;

  // 100::/64 discard-only
  if (hasPrefix(b, [0x01, 0x00, 0, 0, 0, 0, 0, 0], 64)) return true;

  // fc00::/7 unique-local
  if ((b[0]! & 0xfe) === 0xfc) return true;

  // fe80::/10 link-local
  if (b[0] === 0xfe && (b[1]! & 0xc0) === 0x80) return true;

  // ff00::/8 multicast
  if (b[0] === 0xff) return true;

  return false;
}

function isBlockedIpv4(v: number): boolean {
  for (const [base, bits] of BLOCKED_IPV4_RANGES) {
    const baseInt = baseToInt(base);
    if (baseInt === null) continue;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if (((v & mask) >>> 0) === ((baseInt & mask) >>> 0)) return true;
  }
  return false;
}

function be32(b: readonly number[], offset: number): number {
  return (
    (((b[offset] ?? 0) << 24) |
      ((b[offset + 1] ?? 0) << 16) |
      ((b[offset + 2] ?? 0) << 8) |
      (b[offset + 3] ?? 0)) >>>
    0
  );
}

function hasPrefix(b: readonly number[], prefix: readonly number[], bits: number): boolean {
  const fullBytes = bits >> 3;
  for (let i = 0; i < fullBytes; i += 1) {
    if (b[i] !== prefix[i]) return false;
  }
  const restBits = bits & 7;
  if (restBits === 0) return true;
  const mask = (0xff << (8 - restBits)) & 0xff;
  return (((b[fullBytes] ?? 0) & mask) === ((prefix[fullBytes] ?? 0) & mask));
}

/**
 * IPv6 → 16 bytes, incluyendo formas comprimidas y con IPv4 embebido.
 * `null` si la cadena no es una IPv6 válida.
 */
function ipv6ToBytes(ip: string): number[] | null {
  let address = ip.toLowerCase().split('%')[0] ?? '';
  if (address === '') return null;

  // Un IPv4 final se convierte en los dos últimos grupos de 16 bits.
  const trailingV4 = address.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (trailingV4 !== null) {
    const literal = trailingV4[1]!;
    const octets = literal.split('.').map(Number);
    if (octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return null;
    const high = ((octets[0]! << 8) | octets[1]!).toString(16);
    const low = ((octets[2]! << 8) | octets[3]!).toString(16);
    address = `${address.slice(0, address.length - literal.length)}${high}:${low}`;
  }

  const gap = address.indexOf('::');
  let head: string[];
  let tail: string[];

  if (gap === -1) {
    head = address.split(':');
    tail = [];
    if (head.length !== 8) return null;
  } else {
    const before = address.slice(0, gap);
    const after = address.slice(gap + 2);
    head = before === '' ? [] : before.split(':');
    tail = after === '' ? [] : after.split(':');
    // `::` debe expandir al menos un grupo (o ser la dirección entera).
    if (head.length + tail.length > 7) return null;
  }

  const filler = new Array<string>(8 - head.length - tail.length).fill('0');
  const groups = [...head, ...filler, ...tail];
  if (groups.length !== 8) return null;

  const bytes: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    const value = parseInt(group, 16);
    bytes.push((value >> 8) & 0xff, value & 0xff);
  }
  return bytes;
}
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import {
  SafeHttpClient,
  classifyTransportError,
  type HttpTransport,
  type HostResolver,
} from '../src/fetch/safe-http-client';

/**
 * Cubre los 16 FetchOutcome sin abrir sockets: el resolver y el transporte son
 * puertos inyectables. La frontera de fetch es la garantía de seguridad del
 * producto, así que cada rama debe ser observable.
 */

const ALLOWED = 'https://www.eacea.ec.europa.eu/node/253/rss_en';
const PUBLIC: HostResolver = async () => [{ address: '93.184.216.34', family: 4 as const }];

function xmlResponse(headers: Record<string, string> = {}): HttpTransport {
  return async () => ({
    status: 200,
    headers: { 'content-type': 'application/rss+xml; charset=utf-8', ...headers },
    stream: Readable.from([Buffer.from('<rss><channel/></rss>')]) as never,
  });
}

function client(
  transport: HttpTransport,
  resolve: HostResolver = PUBLIC,
): SafeHttpClient {
  return new SafeHttpClient({ resolve, transport });
}

describe('SafeHttpClient — allowlist antes de la red', () => {
  it('nunca llama al resolver con una URL bloqueada', async () => {
    const resolve = vi.fn(PUBLIC);
    const transport = vi.fn(xmlResponse());
    const result = await client(transport as HttpTransport, resolve).fetch(
      'https://evil.com/x',
      { sourceId: 'eacea' },
    );
    expect(result.outcome).toBe('blocked_host');
    expect(resolve).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });

  it('propaga blocked_scheme sin tocar la red', async () => {
    const transport = vi.fn(xmlResponse());
    const result = await client(transport as HttpTransport).fetch('file:///etc/passwd', {
      sourceId: 'eacea',
    });
    expect(result.outcome).toBe('blocked_scheme');
    expect(transport).not.toHaveBeenCalled();
  });
});

describe('SafeHttpClient — DNS', () => {
  it('bloquea si cualquier IP resuelta es privada', async () => {
    const resolve: HostResolver = async () => [
      { address: '93.184.216.34', family: 4 as const },
      { address: '127.0.0.1', family: 4 as const },
    ];
    const transport = vi.fn(xmlResponse());
    const result = await client(transport as HttpTransport, resolve).fetch(ALLOWED, {
      sourceId: 'eacea',
    });
    expect(result.outcome).toBe('blocked_ip');
    expect(transport).not.toHaveBeenCalled();
  });

  it('dns_error si el resolver lanza', async () => {
    const resolve: HostResolver = async () => {
      throw Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' });
    };
    const result = await client(xmlResponse(), resolve).fetch(ALLOWED, { sourceId: 'eacea' });
    expect(result.outcome).toBe('dns_error');
  });

  it('dns_error si no resuelve direcciones', async () => {
    const resolve: HostResolver = async () => [];
    const result = await client(xmlResponse(), resolve).fetch(ALLOWED, { sourceId: 'eacea' });
    expect(result.outcome).toBe('dns_error');
  });

  it('fija la IP validada como destino del socket', async () => {
    let seen: string | undefined;
    const transport: HttpTransport = async (req) => {
      seen = req.pinnedIp.address;
      return {
        status: 200,
        headers: { 'content-type': 'application/xml' },
        stream: Readable.from([Buffer.from('<rss/>')]) as never,
      };
    };
    await client(transport).fetch(ALLOWED, { sourceId: 'eacea' });
    expect(seen).toBe('93.184.216.34');
  });

  it('conserva el hostname en Host y SNI pese a fijar la IP', async () => {
    let host: string | undefined;
    const transport: HttpTransport = async (req) => {
      host = req.host;
      return {
        status: 200,
        headers: { 'content-type': 'application/xml' },
        stream: Readable.from([Buffer.from('<rss/>')]) as never,
      };
    };
    await client(transport).fetch(ALLOWED, { sourceId: 'eacea' });
    expect(host).toBe('www.eacea.ec.europa.eu');
  });
});

describe('SafeHttpClient — códigos HTTP', () => {
  it.each([
    [304, 'not_modified'],
    [429, 'rate_limited'],
    [403, 'challenge_page'],
    [503, 'challenge_page'],
    [500, 'http_5xx'],
    [502, 'http_5xx'],
    [404, 'http_4xx'],
    [410, 'http_4xx'],
  ])('HTTP %i → %s', async (status, outcome) => {
    const transport: HttpTransport = async () => ({
      status,
      headers: {},
      stream: Readable.from([]) as never,
    });
    const result = await client(transport).fetch(ALLOWED, { sourceId: 'eacea' });
    expect(result.outcome).toBe(outcome);
    expect(result.httpStatus).toBe(status);
  });

  it('301 es redirect_violation: la política es redirects=0', async () => {
    const transport: HttpTransport = async () => ({
      status: 301,
      headers: { location: 'https://www.eacea.ec.europa.eu/node/999/rss_en' },
      stream: Readable.from([]) as never,
    });
    const result = await client(transport).fetch(ALLOWED, { sourceId: 'eacea' });
    expect(result.outcome).toBe('redirect_violation');
  });

  it('un 200 con location también es redirect_violation', async () => {
    const transport: HttpTransport = async () => ({
      status: 200,
      headers: { 'content-type': 'application/xml', location: '/otro' },
      stream: Readable.from([]) as never,
    });
    const result = await client(transport).fetch(ALLOWED, { sourceId: 'eacea' });
    expect(result.outcome).toBe('redirect_violation');
  });
});

describe('SafeHttpClient — cuerpo', () => {
  it('rechaza content-type inesperado', async () => {
    const transport: HttpTransport = async () => ({
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      stream: Readable.from([Buffer.from('<html>')]) as never,
    });
    const result = await client(transport).fetch(ALLOWED, { sourceId: 'eacea' });
    expect(result.outcome).toBe('content_type_rejected');
    expect(result.contentType).toBe('text/html; charset=utf-8');
  });

  it('rechaza por content-length declarado sin leer un solo byte', async () => {
    const transport: HttpTransport = async () => ({
      status: 200,
      headers: { 'content-type': 'application/xml', 'content-length': '99999999' },
      stream: Readable.from([Buffer.from('x')]) as never,
    });
    const result = await client(transport, PUBLIC).fetch(ALLOWED, {
      sourceId: 'eacea',
      maxBytes: 1024,
    });
    expect(result.outcome).toBe('too_large');
  });

  it('corta en streaming cuando el body real excede maxBytes', async () => {
    const transport: HttpTransport = async () => ({
      status: 200,
      headers: { 'content-type': 'application/xml' },
      stream: Readable.from([Buffer.alloc(2048, 0x61), Buffer.alloc(2048, 0x62)]) as never,
    });
    const result = await client(transport).fetch(ALLOWED, { sourceId: 'eacea', maxBytes: 1024 });
    expect(result.outcome).toBe('too_large');
  });

  it('ok devuelve cuerpo, etag y status', async () => {
    const transport: HttpTransport = async () => ({
      status: 200,
      headers: { 'content-type': 'application/rss+xml', etag: 'W/"abc"' },
      stream: Readable.from([Buffer.from('<rss><channel/></rss>')]) as never,
    });
    const result = await client(transport).fetch(ALLOWED, { sourceId: 'eacea' });
    expect(result.outcome).toBe('ok');
    expect(result.body).toBe('<rss><channel/></rss>');
    expect(result.etag).toBe('W/"abc"');
    expect(result.httpStatus).toBe(200);
  });

  it('decodifica UTF-8 multibyte partido entre chunks', async () => {
    const full = Buffer.from('Café €', 'utf8');
    const transport: HttpTransport = async () => ({
      status: 200,
      headers: { 'content-type': 'application/xml' },
      stream: Readable.from([full.subarray(0, 4), full.subarray(4)]) as never,
    });
    const result = await client(transport).fetch(ALLOWED, { sourceId: 'eacea' });
    expect(result.body).toBe('Café €');
  });

  it('envía if-none-match solo si hay etag', async () => {
    const withEtag = vi.fn(xmlResponse());
    await client(withEtag as HttpTransport).fetch(ALLOWED, {
      sourceId: 'eacea',
      etag: 'W/"v1"',
    });
    const call = withEtag.mock.calls[0]?.[0] as { headers: Record<string, string> };
    expect(call.headers['if-none-match']).toBe('W/"v1"');

    const withoutEtag = vi.fn(xmlResponse());
    await client(withoutEtag as HttpTransport).fetch(ALLOWED, { sourceId: 'eacea' });
    const call2 = withoutEtag.mock.calls[0]?.[0] as { headers: Record<string, string> };
    expect(call2.headers['if-none-match']).toBeUndefined();
  });

  it('envía un User-Agent identificable', async () => {
    const transport = vi.fn(xmlResponse());
    await client(transport as HttpTransport).fetch(ALLOWED, { sourceId: 'eacea' });
    const call = transport.mock.calls[0]?.[0] as { headers: Record<string, string> };
    expect(call.headers['user-agent']).toMatch(/ScholarshipsIndexBot/);
  });
});

describe('SafeHttpClient — errores de transporte', () => {
  it('timeout por AbortError', async () => {
    const transport: HttpTransport = async () => {
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    };
    const result = await client(transport).fetch(ALLOWED, { sourceId: 'eacea' });
    expect(result.outcome).toBe('timeout');
  });

  it('aborta de verdad si se excede timeoutMs', async () => {
    const transport: HttpTransport = (req) =>
      new Promise((_resolve, reject) => {
        req.signal.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        });
      });
    const result = await client(transport).fetch(ALLOWED, {
      sourceId: 'eacea',
      timeoutMs: 20,
    });
    expect(result.outcome).toBe('timeout');
  });

  it.each([
    [{ code: 'ECONNREFUSED' }, 'connection_refused'],
    [{ code: 'CERT_HAS_EXPIRED' }, 'tls_error'],
    [{ code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' }, 'tls_error'],
    [{ code: 'ERR_TLS_CERT_ALTNAME_INVALID' }, 'tls_error'],
    [{ code: 'EAI_AGAIN' }, 'dns_error'],
    [{}, 'http_5xx'],
  ])('classifica %o como %s', (error, expected) => {
    expect(classifyTransportError(Object.assign(new Error('x'), error))).toBe(expected);
  });
});
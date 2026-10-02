import { request as httpsRequest } from 'node:https';
import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import { checkAllowlist, isBlockedIp } from './allowlist';
import type { FetchOutcome } from '../core/status/types';

/**
 * Frontera de fetch del pipeline. Única puerta por la que sale una petición.
 *
 * Port encapsulado a propósito (technical-blueprint §3.1): migrar a Opción C
 * (worker con egress restringido) no debe requerir reescribir adapters, porque
 * todos los adapters usan este cliente.
 *
 * DNS pinning: la IP que se valida es literalmente la IP a la que se abre el
 * socket. Validar una IP y después dejar que `fetch` vuelva a resolver abre una
 * ventana de DNS rebinding entre la comprobación y el connect — que es
 * exactamente el bypass que este módulo existe para cerrar.
 */

export type SafeFetchOptions = {
  readonly sourceId: string;
  readonly maxBytes?: number;
  readonly timeoutMs?: number;
  readonly etag?: string | null;
  readonly accept?: string;
};

export type SafeFetchResult = {
  readonly outcome: FetchOutcome;
  readonly body?: string;
  readonly etag?: string | null;
  readonly httpStatus?: number;
  readonly contentType?: string;
};

const DEFAULTS = {
  maxBytes: 2 * 1024 * 1024,
  timeoutMs: 15_000,
  accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8',
} as const;

/**
 * Error de transporte ya envuelto. Solo estos pasan por `classifyTransportError`;
 * cualquier otra excepción es un bug nuestro y no debe disfrazarse de fallo del
 * origen.
 */
export class TransportError extends Error {
  constructor(error: unknown) {
    super(error instanceof Error ? error.message : String(error));
    this.name = 'TransportError';
    this.cause = error;
  }
}

/** User-Agent identificable. El scraping responsable empieza por presentarse. */
const USER_AGENT =
  'ScholarshipsIndexBot/0.1 (+https://becas.example/bot; contacto vía página de metodología)';

export type ResolvedAddress = {
  readonly address: string;
  readonly family: 4 | 6;
};

export type HostResolver = (host: string) => Promise<ResolvedAddress[]>;

export type PinnedRequest = {
  readonly url: string;
  readonly host: string;
  readonly pinnedIp: ResolvedAddress;
  readonly headers: Readonly<Record<string, string>>;
  readonly signal: AbortSignal;
};

export type TransportResponse = {
  readonly status: number;
  readonly headers: IncomingHttpHeaders;
  readonly stream: IncomingMessage;
};

/** Transporte de salida. Inyectable para poder testear sin abrir sockets. */
export type HttpTransport = (request: PinnedRequest) => Promise<TransportResponse>;

/** Resolver por defecto. Exportado para tests: la comprobación de IP debe poder probarse sin red. */
export const defaultResolver: HostResolver = async (host) => {
  const dns = await import('node:dns/promises');
  const results = await dns.lookup(host, { all: true, verbatim: true });
  return results.map((r) => ({ address: r.address, family: r.family === 6 ? (6 as const) : (4 as const) }));
};

/**
 * Transporte por defecto: conecta a la IP ya validada.
 *
 * `lookup` se sobrescribe para devolver la IP fijada, de modo que
 * `node:net` no vuelve a consultar DNS. El hostname sigue viajando en el
 * `Host` header y en el SNI de TLS, así que la validación de certificado no
 * se relaja en absoluto.
 */
export const defaultTransport: HttpTransport = (req) =>
  new Promise<TransportResponse>((resolve, reject) => {
    const clientRequest = httpsRequest(
      req.url,
      {
        method: 'GET',
        signal: req.signal,
        headers: req.headers,
        lookup: (_hostname, options, callback) => {
          const wantsAll = typeof options === 'object' && options !== null && 'all' in options;
          if (wantsAll) {
            (callback as (e: null, list: unknown[]) => void)(null, [
              { address: req.pinnedIp.address, family: req.pinnedIp.family },
            ]);
            return;
          }
          (callback as (e: null, address: string, family: number) => void)(
            null,
            req.pinnedIp.address,
            req.pinnedIp.family,
          );
        },
      },
      (response: IncomingMessage) => {
        resolve({ status: response.statusCode ?? 0, headers: response.headers, stream: response });
      },
    );
    clientRequest.on('error', reject);
    clientRequest.end();
  });

export class SafeHttpClient {
  private readonly resolve: HostResolver;
  private readonly transport: HttpTransport;

  constructor(deps: { resolve?: HostResolver; transport?: HttpTransport } = {}) {
    this.resolve = deps.resolve ?? defaultResolver;
    this.transport = deps.transport ?? defaultTransport;
  }

  async fetch(rawUrl: string, options: SafeFetchOptions): Promise<SafeFetchResult> {
    const maxBytes = options.maxBytes ?? DEFAULTS.maxBytes;
    const timeoutMs = options.timeoutMs ?? DEFAULTS.timeoutMs;

    // 1 · Allowlist exacta (esquema → host → path). Antes de cualquier red.
    const decision = checkAllowlist(rawUrl);
    if (!decision.allowed) return { outcome: decision.reason };

    // 2 · Resolución + bloqueo de IPs privadas (DNS rebinding).
    let ips: ResolvedAddress[];
    try {
      ips = await this.resolve(decision.origin.host);
    } catch {
      return { outcome: 'dns_error' };
    }
    if (ips.length === 0) return { outcome: 'dns_error' };
    // Todas, no solo la primera: un host con una A privada y otra pública sigue
    // siendo un host malicioso.
    if (ips.some((ip) => isBlockedIp(ip.address))) return { outcome: 'blocked_ip' };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.transport({
        url: rawUrl,
        host: decision.origin.host,
        pinnedIp: ips[0]!,
        signal: controller.signal,
        headers: {
          'user-agent': USER_AGENT,
          accept: options.accept ?? DEFAULTS.accept,
          ...(options.etag ? { 'if-none-match': options.etag } : {}),
        },
      }).catch((error: unknown) => {
        throw new TransportError(error);
      });

      const httpStatus = response.status;

      if (httpStatus === 304) return { outcome: 'not_modified', httpStatus };
      if (httpStatus === 429) return { outcome: 'rate_limited', httpStatus };
      if (httpStatus === 403 || httpStatus === 503) {
        return { outcome: 'challenge_page', httpStatus };
      }
      if (httpStatus >= 500) return { outcome: 'http_5xx', httpStatus };
      if (httpStatus >= 400) return { outcome: 'http_4xx', httpStatus };

      // Redirect manual: un 3xx que no sea 304 viola la política de redirects=0.
      if (httpStatus >= 300) return { outcome: 'redirect_violation', httpStatus };
      const location = response.headers.location;
      if (typeof location === 'string') return { outcome: 'redirect_violation', httpStatus };

      const contentType = headerValue(response.headers['content-type']);
      if (!isExpectedContentType(contentType)) {
        return { outcome: 'content_type_rejected', httpStatus, contentType };
      }

      const body = await readCapped(response.headers, response.stream, maxBytes);
      if (body === null) {
        response.stream.destroy();
        return { outcome: 'too_large', httpStatus };
      }

      const etag = headerValue(response.headers.etag);
      return {
        outcome: 'ok',
        body,
        etag,
        httpStatus,
        contentType,
      };
    } catch (error) {
      // Un `http_5xx` inventado a partir de un bug propio sería indistinguible
      // de un fallo real del origen y enviaría la fuente al circuit breaker sin
      // motivo. Los fallos internos deben verse como lo que son.
      if (!(error instanceof TransportError)) {
        console.error('[safe-http] fallo interno no clasificado', error);
        return { outcome: 'internal_error' };
      }
      return { outcome: classifyTransportError(error) };
    } finally {
      clearTimeout(timer);
    }
  }
}

function headerValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export function classifyTransportError(error: unknown): FetchOutcome {
  const raw = error instanceof TransportError ? error.cause : error;
  if (raw instanceof Error && (raw.name === 'AbortError' || raw.name === 'TimeoutError')) {
    return 'timeout';
  }
  const code = (raw as { code?: string } | null)?.code;
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns_error';
  if (code === 'ECONNREFUSED') return 'connection_refused';
  if (
    code === 'CERT_HAS_EXPIRED' ||
    code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    code === 'ERR_TLS_CERT_ALTNAME_INVALID'
  ) {
    return 'tls_error';
  }
  return 'http_5xx';
}

function isExpectedContentType(contentType: string): boolean {
  const type = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  return (
    type === 'application/rss+xml' ||
    type === 'application/xml' ||
    type === 'text/xml' ||
    type === 'application/atom+xml'
  );
}

/** Lee el cuerpo abortando en cuanto supera `maxBytes`. */
async function readCapped(
  headers: IncomingHttpHeaders,
  stream: IncomingMessage,
  maxBytes: number,
): Promise<string | null> {
  const declared = headerValue(headers['content-length']);
  if (declared !== '' && Number(declared) > maxBytes) return null;

  return new Promise<string | null>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    stream.on('data', (chunk: Buffer) => {
      received += chunk.byteLength;
      if (received > maxBytes) {
        resolve(null);
        stream.destroy();
        return;
      }
      chunks.push(chunk);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

export const safeHttp = new SafeHttpClient();
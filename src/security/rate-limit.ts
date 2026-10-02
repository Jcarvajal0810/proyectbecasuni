/**
 * Rate limiting en memoria del proceso (technical-blueprint §5.4).
 *
 * Alcance deliberado: protege el endpoint y frena abuso trivial. NO es un
 * control compartido entre funciones serverless. La defensa real contra
 * scraping es la serialización allowlist + `LIMIT` duro en la vista, no este
 * contador (AR-10).
 */

type Bucket = { count: number; resetAt: number };

const globalForLimit = globalThis as unknown as { __rateLimit?: Map<string, Bucket> };
const buckets = (globalForLimit.__rateLimit ??= new Map<string, Bucket>());

export type RateLimitResult = {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key);

  if (bucket === undefined || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  return {
    allowed: true,
    remaining: limit - bucket.count,
    retryAfterSeconds: 0,
  };
}

/** Identificador de cliente sin confiar en cabeceras Suplantables. */
export function clientKey(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd !== null && fwd !== '') return fwd.split(',')[0]?.trim() ?? 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export function applyRateLimitHeaders(headers: Headers, result: RateLimitResult): void {
  headers.set('x-ratelimit-remaining', String(result.remaining));
  if (!result.allowed) headers.set('retry-after', String(result.retryAfterSeconds));
}

/** Limpieza periódica para que el mapa no crezca sin límite. */
export function pruneRateLimits(now: number = Date.now()): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
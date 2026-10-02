import { searchScholarships, type SearchFilters } from '@/db/queries';
import {
  applyRateLimitHeaders,
  clientKey,
  rateLimit,
} from '@/security/rate-limit';
import { INTERNAL_STATUSES, type InternalStatus } from '@/core/status/types';

/**
 * GET /api/scholarships — búsqueda con límite duro.
 *
 * Solo lectura. El `LIMIT` máximo es 100 y vive en el servidor: la vista no
 * debe poder enumerar el corpus, y un cliente no debe poder pedirlo.
 */
export async function GET(request: Request): Promise<Response> {
  const limit = rateLimit(`search:${clientKey(request)}`, 60, 60_000);
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
  applyRateLimitHeaders(headers, limit);

  if (!limit.allowed) {
    headers.set('retry-after', String(limit.retryAfterSeconds));
    return new Response(
      JSON.stringify({ error: 'rate_limited', message: 'Demasiadas peticiones.' }),
      { status: 429, headers },
    );
  }

  const url = new URL(request.url);
  const params = url.searchParams;

  const statusParam = params.get('status');
  const statuses = parseStatuses(statusParam);

  const windowDaysRaw = params.get('window_days');
  const windowDays = windowDaysRaw === null ? undefined : Number(windowDaysRaw);
  if (windowDays !== undefined && (!Number.isFinite(windowDays) || windowDays < 1)) {
    return json({ error: 'invalid_parameter', field: 'window_days' }, 400, headers);
  }

  const filters: SearchFilters = {
    q: params.get('q') ?? undefined,
    country: normalizeCountry(params.get('country')),
    level: normalizeLevel(params.get('level')),
    status: statuses,
    windowDays: Number.isFinite(windowDays) ? windowDays : undefined,
    limit: Number(params.get('limit') ?? 24),
    offset: Number(params.get('offset') ?? 0),
  };

  try {
    const result = await searchScholarships(filters);
    const effectiveLimit = Math.min(Math.max(filters.limit ?? 24, 1), 100);
    return json(
      {
        items: result.items,
        page: {
          returned: result.items.length,
          has_more: result.hasMore,
          limit: effectiveLimit,
          offset: Math.max(filters.offset ?? 0, 0),
        },
      },
      200,
      headers,
    );
  } catch {
    // El detalle del error no sale hacia el cliente: una excepción de Postgres
    // puede contener nombres de columna o fragmentos de consulta.
    return json({ error: 'unavailable' }, 503, headers);
  }
}

function parseStatuses(raw: string | null): InternalStatus[] | undefined {
  if (raw === null || raw === '') return undefined;
  const requested = raw.split(',').map((s) => s.trim().toUpperCase());
  const valid = requested.filter((s): s is InternalStatus =>
    (INTERNAL_STATUSES as readonly string[]).includes(s),
  );
  return valid.length > 0 ? valid : undefined;
}

function normalizeCountry(raw: string | null): string | undefined {
  if (raw === null || raw === '') return undefined;
  const value = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(value) ? value : undefined;
}

const LEVELS = new Set(['BACHELOR', 'MASTER', 'PHD', 'POSTDOC', 'SHORT_TERM', 'OTHER']);

function normalizeLevel(raw: string | null): string | undefined {
  if (raw === null || raw === '') return undefined;
  const value = raw.trim().toUpperCase();
  return LEVELS.has(value) ? value : undefined;
}

function json(body: unknown, status: number, headers: Headers): Response {
  return new Response(JSON.stringify(body), { status, headers });
}
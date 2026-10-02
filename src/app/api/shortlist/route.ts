import { NextResponse, type NextRequest } from 'next/server';
import {
  SHORTLIST_COOKIE,
  addToShortlist,
  countShortlist,
  ensureShortlist,
  generateToken,
  listShortlist,
  removeFromShortlist,
  validateSlug,
} from '@/shortlist/shortlist';
import { isDatabaseConfigured } from '@/db/client';
import { clientKey, rateLimit } from '@/security/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * `/api/shortlist` — shortlist anónima (D5).
 *
 * El token se emite como cookie `httpOnly` + `SameSite=Lax`. `Lax` basta porque
 * el POST es same-origin y `form-action 'self'` en la CSP impide el cross-site
 * POST. `Strict` rompería el retorno desde un email, que es un caso de uso real
 * de "guarda esto y compártelo".
 */
function readToken(request: NextRequest): string | null {
  return request.cookies.get(SHORTLIST_COOKIE)?.value ?? null;
}

function withToken(response: NextResponse, token: string): NextResponse {
  response.cookies.set(SHORTLIST_COOKIE, token, {
    path: '/',
    maxAge: 31_536_000,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

export async function GET(request: NextRequest): Promise<Response> {
  if (!isDatabaseConfigured()) {
    return Response.json({ items: [], count: 0, demo: true });
  }

  const token = readToken(request);
  if (token === null) return Response.json({ items: [], count: 0 });

  const [items, count] = await Promise.all([listShortlist(token), countShortlist(token)]);
  return Response.json({ items, count });
}

export async function POST(request: NextRequest): Promise<Response> {
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'not_configured' }, { status: 503 });
  }

  // Escritura sin autenticación: sin rate limit, un bucle de un script llenaría
  // la tabla. 30/min por IP frena el abuso trivial, que es el alcance real de
  // este contador (no es un control compartido entre funciones).
  const limit = rateLimit(`shortlist:${clientKey(request)}`, 30, 60_000);
  if (!limit.allowed) {
    return Response.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 });
  }

  const { slug, action } = (payload ?? {}) as { slug?: unknown; action?: unknown };
  if (!validateSlug(slug)) return Response.json({ error: 'bad_slug' }, { status: 400 });
  if (action !== 'add' && action !== 'remove') {
    return Response.json({ error: 'bad_action' }, { status: 400 });
  }

  // Se reutiliza la cookie del visitante o se emite una nueva. El token nunca
  // se acepta desde el cuerpo: si el cliente pudiera elegirlo, podría
  // adivinar/sustituir el de otro.
  const current = readToken(request);
  const isNew = current === null;
  const token = current ?? generateToken();

  await ensureShortlist(token);

  if (action === 'add') {
    const added = await addToShortlist(token, slug);
    if (!added) {
      // Slug inexistente, no publicado, demo o borrado: indistinguible a
      // propósito. No revelamos qué slugs existen.
      const count = await countShortlist(token);
      const response = NextResponse.json({ ok: false, count }, { status: 404 });
      return isNew ? withToken(response, token) : response;
    }
    const count = await countShortlist(token);
    const response = NextResponse.json({ ok: true, count });
    return isNew ? withToken(response, token) : response;
  }

  await removeFromShortlist(token, slug);
  const count = await countShortlist(token);
  const response = NextResponse.json({ ok: true, count });
  return isNew ? withToken(response, token) : response;
}
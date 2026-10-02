import { NextResponse, type NextRequest } from 'next/server';
import { LOCALE_COOKIE, isLocale } from '@/i18n/messages';

const MAX_RETURN_TO = 200;

/**
 * Reduce `returnTo` a una ruta interna o '/'.
 *
 * Los navegadores tratan `\` como separador de autoridad igual que `/`, así que
 * un chequeo que solo mire `//` deja pasar `/\evil.com` y `/\/evil.com`. Por eso
 * se normalizan las barras antes de decidir.
 */
export function safeReturnTo(raw: unknown): string {
  if (typeof raw !== 'string') return '/';
  if (raw.length === 0 || raw.length > MAX_RETURN_TO) return '/';

  const normalized = raw.replace(/\\/g, '/');
  if (!normalized.startsWith('/')) return '/';
  // `//host` y `//` con separador inicial son autoridad, no ruta.
  if (normalized.startsWith('//')) return '/';

  // Una ruta absoluta nunca debe contener un esquema ni una autoridad.
  try {
    const parsed = new URL(normalized, 'https://internal.invalid');
    if (parsed.origin !== 'https://internal.invalid') return '/';
  } catch {
    return '/';
  }
  return normalized;
}

/**
 * Cambio de idioma por POST + cookie.
 *
 * `returnTo` solo puede ser una ruta interna: sin esto el endpoint sería un
 * redirector abierto hacia cualquier origen (open redirect).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const requested = form.get('locale');
  const returnTo = form.get('returnTo');

  const locale = typeof requested === 'string' && isLocale(requested) ? requested : 'es';
  const safe = safeReturnTo(returnTo);

  const response = NextResponse.redirect(new URL(safe, request.url), 303);
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 31_536_000,
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
}
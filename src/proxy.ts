import { NextResponse, type NextRequest } from 'next/server';

/**
 * CSP estricta con nonce por request (security-baseline §6.2: sin `unsafe-inline`
 * ni `unsafe-eval` en `script-src`).
 *
 * En Next.js 16 esto vive en `proxy.ts` (antes `middleware.ts`).
 *
 * La única relajación es `style-src 'unsafe-inline'`: los estilos en línea de
 * React no ejecutan código y `script-src` es la directiva que frena XSS.
 * Relajar `script-src` sería inaceptable.
 *
 * CONSECUENCIA ACORDADA, no un descuido: los nonces exigen render dinámico, así
 * que se pierde la caché estática de las páginas. A cambio, la capa de datos usa
 * `use cache` (§8), de modo que las lecturas de Postgres siguen cacheadas y el
 * coste se limita a la renderización del HTML. La alternativa estable era
 * `unsafe-inline`, que la baseline prohíbe. Si el coste de render resulta
 * medible en los SLO de M3–M7, la salida es CSP por hash (SRI, hoy experimental),
 * no relajar la política.
 */

export function buildCsp(nonce: string, isDev = process.env.NODE_ENV === 'development'): string {
  return [
    "default-src 'self'",
    // `unsafe-eval` solo en desarrollo (React Refresh lo necesita). Jamás en
    // producción: permitiría ejecutar strings como código.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // `style-src` NO lleva `unsafe-eval` en ningún entorno: solo `script-src`
    // ejecuta código. Ponerlo aquí era una relajación sin justificación.
    `style-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    // Trusted Types: cierra el vector DOM-XSS que sobrevive a un CSP con nonce.
    "require-trusted-types-for 'script'",
    'trusted-types nextjs#bundler nextjs',
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "worker-src 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set('content-security-policy', csp);
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'strict-transport-security',
    'max-age=63072000; includeSubDomains; preload',
  );
  response.headers.set(
    'permissions-policy',
    'geolocation=(), camera=(), microphone=(), payment=(), usb=()',
  );
  // Sin este header el navegador reporta el nombre y la versión del framework.
  response.headers.delete('x-powered-by');

  return response;
}

export const config = {
  matcher: [
    {
      // Todo salvo assets estáticos, el optimizador de imágenes y el health check.
      source: '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
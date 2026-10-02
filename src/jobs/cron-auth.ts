import { timingSafeEqual } from 'node:crypto';

/**
 * Auth por secreto compartido con comparación en tiempo constante.
 *
 * Distinto del HMAC de `src/jobs/auth.ts` a propósito. Ahí el secreto firma una
 * carga con timestamp e idem key, porque quien llama (QStash o un runner) puede
 * construir la firma. Aquí el problema es otro: Vercel **no puede firmar** una
 * petición de cron, solo enviar una cabecera. La firma no es posible, así que la
 * autenticación es un bearer token comparado en tiempo constante.
 *
 * Falla cerrado: sin `CRON_SECRET` configurado la ruta devuelve 503. No hay modo
 * de desarrollo, porque un endpoint de sync abierto en desarrollo acaba
 * desplegándose con la variable sin poner.
 */

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  // `timingSafeEqual` exige la misma longitud. Comparar longitudes por
  // separado filtra la longitud del secreto, que aquí se conoce igual (la de un
  // token de 32 bytes) y no aporta nada utilizable.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type CronAuthResult = { readonly ok: true } | { readonly ok: false; readonly status: 401 | 503 };

export function verifyCronSecret(header: string | null): CronAuthResult {
  const expected = process.env.CRON_SECRET;
  if (expected === undefined || expected === '') return { ok: false, status: 503 };

  if (header === null || header === '') return { ok: false, status: 401 };
  if (!header.startsWith('Bearer ')) return { ok: false, status: 401 };

  return secretsMatch(header.slice('Bearer '.length), expected)
    ? { ok: true }
    : { ok: false, status: 401 };
}
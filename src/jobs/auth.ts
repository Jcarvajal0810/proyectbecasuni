import { createHmac, timingSafeEqual } from 'node:crypto';
import { isValidIdemKey } from './replay-guard';

/**
 * Auth interna de jobs y del panel de curación (technical-blueprint §5.4).
 *
 * Secreto compartido firmado HMAC-SHA256 sobre
 * `<timestamp>.<idemKey>.<body>`. La ventana de 5 minutos impide reutilizar un
 * token capturado; la clave de idempotencia, firmado *dentro* del HMAC, impide
 * reutilizar uno recién capturado. Ambas son necesarias: la ventana sola deja
 * replay ilimitado dentro de los 5 minutos.
 *
 * La comparación es en tiempo constante. **Falla cerrado**: sin secreto
 * configurado no hay bypass, tampoco en desarrollo.
 */

const WINDOW_MS = 5 * 60 * 1000;

function secret(): string {
  const value = process.env.JOB_HMAC_SECRET;
  if (value === undefined || value === '') {
    throw new Error('Falta JOB_HMAC_SECRET. No hay modo de desarrollo para la auth de jobs.');
  }
  return value;
}

/**
 * Firma `<timestamp>.<idemKey>.<body>`.
 *
 * El idemKey entra en el payload firmado, no solo en la cabecera: si no, un
 * atacante que capture una firma podría cambiar el idemKey en la cabecera para
 * evadir el guard de replay.
 */
export function signJobPayload(
  body: string,
  idemKey: string,
  timestamp: number = Date.now(),
): string {
  if (!isValidIdemKey(idemKey)) {
    throw new Error('idemKey inválida: debe tener entre 16 y 64 caracteres [A-Za-z0-9_-].');
  }
  const signature = createHmac('sha256', secret())
    .update(`${timestamp}.${idemKey}.${body}`)
    .digest('hex');
  return `${timestamp}.${idemKey}.${signature}`;
}

export type JobAuthResult =
  | { readonly ok: true; readonly idemKey: string }
  | {
      readonly ok: false;
      readonly status: 401 | 403;
      readonly reason: 'missing' | 'malformed' | 'bad_signature' | 'expired' | 'bad_idem_key';
    };

export function verifyJobSignature(
  header: string | null,
  body: string,
  idemHeader: string | null,
): JobAuthResult {
  if (header === null || header === '') return { ok: false, status: 401, reason: 'missing' };

  const parts = header.split('.');
  if (parts.length !== 3) return { ok: false, status: 401, reason: 'malformed' };

  const [rawTimestamp, embeddedIdemKey, signature] = parts as [string, string, string];
  const timestamp = Number(rawTimestamp);
  if (!Number.isFinite(timestamp)) return { ok: false, status: 401, reason: 'malformed' };

  // La clave debe coincidir con la cabecera Y estar bien formada. Si solo se
  // validara la cabecera, bastaría cambiarla para reenviar un replay.
  if (!isValidIdemKey(embeddedIdemKey) || embeddedIdemKey !== idemHeader) {
    return { ok: false, status: 401, reason: 'bad_idem_key' };
  }

  if (Math.abs(Date.now() - timestamp) > WINDOW_MS) {
    return { ok: false, status: 403, reason: 'expired' };
  }

  const expected = createHmac('sha256', secret())
    .update(`${timestamp}.${embeddedIdemKey}.${body}`)
    .digest('hex');

  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return { ok: false, status: 403, reason: 'bad_signature' };

  return timingSafeEqual(a, b)
    ? { ok: true, idemKey: embeddedIdemKey }
    : { ok: false, status: 403, reason: 'bad_signature' };
}
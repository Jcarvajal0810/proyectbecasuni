import { verifyJobSignature } from '@/jobs/auth';
import { ReplayGuard } from '@/jobs/replay-guard';
import { syncAll } from '@/jobs/sync';

/**
 * POST /api/jobs/sync — dispara el pipeline de sync.
 *
 * Auth: secreto firmado HMAC con ventana de 5 minutos y clave de idempotencia
 * firmada dentro del propio HMAC. Falla cerrado: sin `JOB_HMAC_SECRET`
 * configurado devuelve 503, no un 200 de cortesía. No hay bypass de desarrollo
 * (technical-blueprint §5.4).
 */

/**
 * Guard a nivel de módulo: sobrevive entre invocaciones dentro de la misma
 * instancia. En Vercel el proceso es efímero, así que esto no es un singleton
 * global — es la mejor defensa disponible sin store compartido, y el pipeline es
 * idempotente (upsert), de modo que una repetición no corrompe datos.
 */
const replayGuard = new ReplayGuard();

export async function POST(request: Request): Promise<Response> {
  if (process.env.JOB_HMAC_SECRET === undefined || process.env.JOB_HMAC_SECRET === '') {
    return Response.json(
      { error: 'not_configured', message: 'El runner de sync no está configurado.' },
      { status: 503 },
    );
  }

  const body = await request.text();
  const auth = verifyJobSignature(
    request.headers.get('x-job-signature'),
    body,
    request.headers.get('x-job-idem-key'),
  );
  if (!auth.ok) {
    return Response.json({ error: 'unauthorized', reason: auth.reason }, { status: auth.status });
  }

  // La ventana de 5 minutos permite reenviar la misma petición firmada. Esta es
  // la comprobación que lo impide.
  if (!replayGuard.register(auth.idemKey)) {
    return Response.json(
      { error: 'replayed', message: 'Esta petición ya se procesó.' },
      { status: 409 },
    );
  }

  try {
    const reports = await syncAll();
    return Response.json({ runs: reports }, { status: 200 });
  } catch {
    // La clave se registró antes de trabajar, así que un fallo la habría
    // consumido: QStash y el runner manual recibirían 409 durante todo el TTL
    // aunque el sync nunca se hubiera hecho. Liberarla hace que el reintento sea
    // una entrega nueva en vez de un rechazo permanente.
    replayGuard.release(auth.idemKey);
    return Response.json({ error: 'sync_failed' }, { status: 500 });
  }
}

export async function GET(): Promise<Response> {
  // Un runner externo (QStash, cron de Vercel) reintenta si recibe un método
  // no permitido. Dejarlo explícito evita un 405 que se registra como incidente.
  return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: { allow: 'POST' } });
}
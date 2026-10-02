import {
  type ResolvedStatus,
  type StatusInput,
  FETCH_FAILURES,
} from './types';

const NON_REVIEW_TRANSIENT = new Set([
  'http_5xx',
  'rate_limited',
  'circuit_open',
  'budget_exhausted',
]);

const FAILURE_REASON: Record<string, (i: StatusInput) => string> = {
  timeout: () => 'No pudimos contactar con la fuente (tiempo de espera agotado)',
  dns_error: () => 'No se pudo resolver el dominio de la fuente',
  connection_refused: () => 'La fuente rechazó la conexión',
  tls_error: () => 'No se pudo establecer una conexión segura con la fuente',
  http_4xx: (i) =>
    `La fuente respondió con un error${i.httpStatus ? ` (HTTP ${i.httpStatus})` : ''}`,
  http_5xx: () => 'La fuente está temporalmente caída',
  too_large: () => 'La respuesta superó el límite de tamaño permitido',
  blocked_scheme: () => 'Bloqueado por política de seguridad (esquema no permitido)',
  blocked_host: () => 'Bloqueado por política de seguridad (host no permitido)',
  blocked_ip: () =>
    'Bloqueado por política de seguridad (dirección no permitida)',
  redirect_violation: () => 'La fuente redirigió a un destino no permitido',
  rate_limited: () => 'La fuente pidió limitar el ritmo de consulta',
  circuit_open: () => 'La fuente está en pausa por errores repetidos',
  content_type_rejected: () =>
    'La fuente devolvió un tipo de contenido no esperado',
  challenge_page: () => 'La fuente nos mostró una página de verificación',
  budget_exhausted: () =>
    'No se alcanzó esta verificación en esta pasada (tiempo/solicitudes agotados)',
  internal_error: () =>
    'Falló la verificación por un problema interno (no de la fuente)',
};

function unknownFromFailure(input: StatusInput): ResolvedStatus {
  const build = FAILURE_REASON[input.fetchOutcome];
  return {
    status: 'UNKNOWN',
    confidence: input.fetchOutcome === 'http_4xx' ? 'MEDIUM' : 'HIGH',
    reason: build(input),
    preserveLastKnown: true,
    needsReview: !NON_REVIEW_TRANSIENT.has(input.fetchOutcome),
  };
}

/** `opening_date` es un `date`: se compara contra "hoy" en la zona del lector. */
function isOpeningDateInFuture(openingDate: string, now: Date, timeZone: string): boolean {
  const readerToday = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return openingDate > readerToday;
}

/**
 * Motor de estado. Función pura (ADR-002): sin I/O, sin `Date.now()`, sin DB.
 * Especificación completa en `docs/data-strategy/data-strategy.md` §3.
 *
 * La primera rama evalúa el `fetchOutcome` ANTES de mirar cualquier evidencia de
 * contenido y retorna para los 16 fallos. Por construcción no hay forma de que
 * un `OPEN` o un `CLOSED` salga de un fallo de fetch.
 */
export function resolveStatus(input: StatusInput): ResolvedStatus {
  const { fetchOutcome, evidence, now, readerTimeZone } = input;

  if (fetchOutcome !== 'ok' && fetchOutcome !== 'not_modified') {
    if (FETCH_FAILURES.includes(fetchOutcome)) return unknownFromFailure(input);
    return unknownFromFailure(input);
  }

  // S-1 · CLOSED explícito. Única vía por la que se alcanza CLOSED.
  if (
    evidence.sourceStatus === 'CLOSED' ||
    evidence.sourceExplicitlySaysClosed
  ) {
    return {
      status: 'CLOSED',
      confidence: 'HIGH',
      reason: 'La fuente indica que las solicitudes están cerradas',
      preserveLastKnown: false,
      needsReview: false,
    };
  }

  // S-2 · PAUSED explícito.
  if (evidence.sourceStatus === 'PAUSED' || evidence.sourceExplicitlySaysPaused) {
    return {
      status: 'PAUSED',
      confidence: 'HIGH',
      reason: 'La fuente indica que la convocatoria está suspendida',
      preserveLastKnown: false,
      needsReview: false,
    };
  }

  // S-3 · UPCOMING explícito.
  if (evidence.sourceStatus === 'UPCOMING') {
    return {
      status: 'UPCOMING',
      confidence: 'HIGH',
      reason: 'La fuente anuncia la convocatoria y aún no está abierta',
      preserveLastKnown: false,
      needsReview: false,
    };
  }

  const deadlinePast =
    evidence.deadlineAt !== null && evidence.deadlineAt < now;
  const deadlineFuture =
    evidence.deadlineAt !== null && evidence.deadlineAt > now;

  if (
    evidence.openingDate !== null &&
    isOpeningDateInFuture(evidence.openingDate, now, readerTimeZone)
  ) {
    // S-8 · openingDate futuro → UPCOMING.
    return {
      status: 'UPCOMING',
      confidence: 'MEDIUM',
      reason: 'La convocatoria aún no ha abierto',
      preserveLastKnown: false,
      needsReview: false,
    };
  }

  // S-5 · OPEN explícito + deadline pasado = conflicto → UNKNOWN + revisión.
  if (evidence.sourceStatus === 'OPEN' && deadlinePast) {
    return {
      status: 'UNKNOWN',
      confidence: 'MEDIUM',
      reason: 'La fuente dice abierta pero el deadline ya pasó · requiere revisión',
      preserveLastKnown: true,
      needsReview: true,
    };
  }

  // S-6 · OPEN explícito + deadline inferido del ciclo → no instructivo.
  if (
    evidence.sourceStatus === 'OPEN' &&
    evidence.deadlineBasis === 'inferred_from_cycle'
  ) {
    return {
      status: 'UNKNOWN',
      confidence: 'LOW',
      reason: 'No hay deadline confirmado por la fuente · requiere revisión',
      preserveLastKnown: true,
      needsReview: true,
    };
  }

  // S-4 · OPEN explícito sin deadline contradictorio.
  if (
    evidence.sourceStatus === 'OPEN' &&
    evidence.openingDate !== null &&
    !isOpeningDateInFuture(evidence.openingDate, now, readerTimeZone)
  ) {
    return {
      status: 'OPEN',
      confidence: 'HIGH',
      reason: 'La fuente indica que las solicitudes están abiertas',
      preserveLastKnown: false,
      needsReview: false,
    };
  }

  // S-7a · OPEN explícito sin openingDate.
  if (evidence.sourceStatus === 'OPEN' && evidence.openingDate === null) {
    return {
      status: 'OPEN',
      confidence: 'HIGH',
      reason: 'La fuente indica que las solicitudes están abiertas',
      preserveLastKnown: false,
      needsReview: false,
    };
  }

  // S-7b · Deadline vigente declarado por la fuente, sin contradicción.
  if (deadlineFuture && evidence.deadlineBasis === 'publisher_stated') {
    return {
      status: 'OPEN',
      confidence: 'MEDIUM',
      reason: 'El deadline aún no ha pasado',
      preserveLastKnown: false,
      needsReview: false,
    };
  }

  // S-9 · Deadline pasado declarado por la fuente y la fuente no dice OPEN.
  if (deadlinePast && evidence.deadlineBasis === 'publisher_stated') {
    return {
      status: 'EXPIRED',
      confidence: 'MEDIUM',
      reason: 'El deadline de solicitudes ya pasó',
      preserveLastKnown: false,
      needsReview: false,
    };
  }

  // S-10 · Deadline estimado ya pasado: no instructivo.
  if (deadlinePast && evidence.deadlineBasis === 'inferred_from_cycle') {
    return {
      status: 'UNKNOWN',
      confidence: 'LOW',
      reason: 'El deadline estimado ya pasó · requiere revisión',
      preserveLastKnown: true,
      needsReview: true,
    };
  }

  // S-11 · Nada concluyente.
  return {
    status: 'UNKNOWN',
    confidence: 'LOW',
    reason: 'Sin información suficiente para determinar el estado',
    preserveLastKnown: true,
    needsReview: true,
  };
}
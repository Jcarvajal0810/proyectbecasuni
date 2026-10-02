/**
 * Guard de replay para los jobs firmados.
 *
 * La ventana de 5 minutos de la firma evita reutilizar un token *viejo*, pero
 * no impide reutilizar uno *recién* capturado: dentro de la ventana, la misma
 * petición se puede reenviar ilimitadas veces. Para el sync eso significa
 * disparar N pasadas idénticas en paralelo.
 *
 * La defensa es una clave de idempotencia firmada junto al body: el servidor
 * recuerda las claves recientes y rechaza la segunda entrega de la misma.
 *
 * Deliberadamente en memoria y no en Postgres: el runner es un proceso aislado
 * por invocación en Vercel, así que un almacén compartido no daría una
 * garantía de singleton real. El peor caso de perder el registro al reiniciar
 * es una repetición idempotente — el pipeline es un upsert, no un append.
 */

type Entry = { readonly expiresAt: number };

export class ReplayGuard {
  private readonly seen = new Map<string, Entry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(options: { ttlMs?: number; maxEntries?: number } = {}) {
    // El TTL debe superar la ventana de la firma; si no, una clave puede
    // expirar del guard antes de expirar de la ventana y volver a aceptarse.
    this.ttlMs = options.ttlMs ?? 10 * 60 * 1000;
    this.maxEntries = options.maxEntries ?? 1_000;
  }

  /**
   * Registra la clave y devuelve `true` si es nueva.
   * `false` significa replay: la misma clave ya se vio dentro del TTL.
   */
  register(key: string, now: number = Date.now()): boolean {
    this.sweep(now);

    const existing = this.seen.get(key);
    if (existing !== undefined && existing.expiresAt > now) return false;

    this.seen.set(key, { expiresAt: now + this.ttlMs });

    // Evitar crecimiento sin límite si el proceso vive mucho y hay muchas
    // claves únicas. Se descarta la más antigua: es la que menos protege.
    if (this.seen.size > this.maxEntries) {
      const oldestKey = this.seen.keys().next();
      if (!oldestKey.done) this.seen.delete(oldestKey.value);
    }
    return true;
  }

  /**
   * Libera una clave registrada con `register`.
   *
   * La clave se registra ANTES de ejecutar el trabajo para bloquear la
   * concurrencia, pero si el trabajo falla la entrega no se consumió: quien la
   * reintenta (QStash, el runner manual) recibe un 409 durante todo el TTL sin
   * que la operación haya ocurrido jamás. Liberarla en el fallo hace que el
   * reintento sea una entrega nueva, que es lo que el reintento significa.
   *
   * Solo se borra si la entrada sigue siendo la que registramos: si expiró y
   * otra petición la reclamó, borrarla abriría la puerta a un replay real.
   */
  release(key: string): void {
    this.seen.delete(key);
  }

  private sweep(now: number): void {
    for (const [key, entry] of this.seen) {
      if (entry.expiresAt <= now) this.seen.delete(key);
    }
  }
}

/**
 * Formato de la clave de idempotencia. Deliberadamente restricted: entra en una
 * comparación HMAC y en una clave de store, así que no puede contener separadores
 * ni caracteres de control.
 */
export const IDEM_KEY_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export function isValidIdemKey(value: string | null): value is string {
  return value !== null && IDEM_KEY_PATTERN.test(value);
}
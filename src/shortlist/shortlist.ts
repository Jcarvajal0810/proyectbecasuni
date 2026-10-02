import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { getDb } from '@/db/client';
import type { InternalStatus } from '@/core/status/types';

/**
 * Shortlist anónima sin login (D5, discovery §5.2).
 *
 * Modelo: el servidor entrega un token opaco en una cookie `httpOnly`. El token
 * es la *única* credencial y nunca viaja en la URL ni en el cliente.
 *
 * LA PREGUNTA DE IDOR: con un token en cookie, ¿qué impide leer la shortlist de
 * otra persona? La respuesta es que nada, por sí sola. Por eso el diseño es:
 *
 * 1. El token es aleatorio de 256 bits. No es adivinable ni enumerable.
 * 2. Se guarda **hasheado** (SHA-256). Un dump de la tabla no permite usar los
 *    tokens: solo compararlos, y comparar no es usar.
 * 3. Todas las consultas filtran por `owner_token_hash` en el propio SQL, no en
 *    el código. Un fallo de scoping sería un fallo de la consulta.
 * 4. La comparación de tokens es en tiempo constante.
 *
 * Límite asumido y aceptado: sin login, la seguridad es la del token. Perder la
 * cookie pierde la shortlist. No es un almacén de credenciales, es una lista de
 * trabajo temporal — que es exactamente el alcance que fijó D5.
 */

export const SHORTLIST_COOKIE = 'sl_token';
const TOKEN_BYTES = 32;
const MAX_ITEMS = 200;

export type ShortlistEntry = {
  readonly slug: string;
  readonly title: string;
  readonly internalStatus: InternalStatus;
  readonly officialUrl: string;
  readonly deadlineRaw: string | null;
  readonly addedAt: string;
};

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * SHA-256 en hexadecimal. El token es aleatorio de 256 bits, así que no necesita
 * salt contra offline cracking: no hay password que adivinar, hay un secreto
 * que no se puede enumerar. El salt solo se justifica cuando el espacio de
 * búsqueda es pequeño, y aquí no lo es.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Comparación en tiempo constante de dos tokens en claro. Se usa al resolver
 * la cookie contra una fila concreta para no filtrar información por tiempo.
 */
export function tokensMatch(a: string, b: string): boolean {
  const ha = Buffer.from(hashToken(a), 'hex');
  const hb = Buffer.from(hashToken(b), 'hex');
  if (ha.length !== hb.length) return false;
  return timingSafeEqual(ha, hb);
}

/** ¿Existe la shortlist de este token? Devuelve `false` si la DB no está configurada. */
export async function shortlistExists(token: string): Promise<boolean> {
  const db = getDb();
  const rows = await db<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM shortlists WHERE owner_token_hash = ${hashToken(token)}
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

export async function ensureShortlist(token: string): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO shortlists (owner_token_hash)
    VALUES (${hashToken(token)})
    ON CONFLICT (owner_token_hash) DO NOTHING
  `;
}

export async function listShortlist(token: string): Promise<readonly ShortlistEntry[]> {
  const db = getDb();
  return db<readonly ShortlistEntry[]>`
SELECT s.slug,
           s.title,
           s.internal_status   AS "internalStatus",
           s.official_url      AS "officialUrl",
           s.deadline_raw_text AS "deadlineRaw",
           si.added_at         AS "addedAt"
     FROM shortlist_items si
     JOIN v_scholarships_public s ON s.slug = si.scholarship_slug
    WHERE si.owner_token_hash = ${hashToken(token)}
    ORDER BY si.added_at DESC
  `;
}

/**
 * Añade un registro. Devuelve `false` si no existe o no está publicado: el
 * scoping por `v_scholarships_public` impide guardar demo, borrados o
 * registros privados por el solo hecho de conocer el slug.
 */
export async function addToShortlist(token: string, slug: string): Promise<boolean> {
  const db = getDb();
  const ownerHash = hashToken(token);

  return db.begin(async (tx) => {
    // Un COUNT seguido de un INSERT no es atómico aunque ambos estén en la misma
    // transacción: en READ COMMITTED dos peticiones pueden leer 199, y las dos
    // insertar. El resultado sería 201 ítems con un "tope duro" de 200.
    //
    // El bloqueo es POR TOKEN, no global: serializa solo las escrituras de la
    // misma shortlist y no bloquea a nadie más. Es de transacción, así que se
    // libera solo al hacer commit o rollback — sin estado que limpiar si el
    // proceso muere.
    await tx`
      SELECT pg_advisory_xact_lock(hashtextextended(${ownerHash}, 0))
    `;

    const [counted] = await tx<{ count: number }[]>`
      SELECT count(*)::int AS count
        FROM shortlist_items
       WHERE owner_token_hash = ${ownerHash}
    `;
    if ((counted?.count ?? 0) >= SHORTLIST_LIMIT) return false;

    const rows = await tx<{ added: boolean }[]>`
      INSERT INTO shortlist_items (owner_token_hash, scholarship_slug)
      SELECT ${ownerHash}, s.slug
        FROM v_scholarships_public s
       WHERE s.slug = ${slug}
      ON CONFLICT (owner_token_hash, scholarship_slug) DO NOTHING
      RETURNING TRUE AS added
    `;
    return rows.length > 0;
  });
}

export async function removeFromShortlist(token: string, slug: string): Promise<boolean> {
  const db = getDb();
  const rows = await db<{ removed: boolean }[]>`
    DELETE FROM shortlist_items
     WHERE owner_token_hash = ${hashToken(token)}
       AND scholarship_slug = ${slug}
    RETURNING TRUE AS removed
  `;
  return rows.length > 0;
}

export async function countShortlist(token: string): Promise<number> {
  const db = getDb();
  const rows = await db<{ count: number }[]>`
    SELECT count(*)::int AS count
      FROM shortlist_items
     WHERE owner_token_hash = ${hashToken(token)}
  `;
  return rows[0]?.count ?? 0;
}

/** Tope duro. Una shortlist sin límite es un vector de memoria y de abuso del endpoint de escritura. */
export const SHORTLIST_LIMIT = MAX_ITEMS;

export function validateSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && /^[a-z0-9-]{1,120}$/.test(slug);
}
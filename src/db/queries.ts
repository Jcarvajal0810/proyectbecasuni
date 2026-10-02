import postgres from 'postgres';
import { getDb, isDatabaseConfigured } from './client';
import type {
  DeadlineBasis,
  DeadlinePrecision,
  InternalStatus,
  SourceStatus,
} from '../core/status/types';

const sql = postgres({});

export const PUBLIC_FIELDS = [
  'id',
  'slug',
  'title',
  'provider',
  'university',
  'country_iso2',
  'level',
  'fields',
  'funding_type',
  'cycle_label',
  'official_url',
  'application_url',
  'source_url',
  'source_licence',
  'internal_status',
  'status_reason',
  'last_known_status',
  'last_known_status_at',
  'opening_date',
  'deadline_at',
  'deadline_basis',
  'deadline_precision',
  'deadline_tz',
  'deadline_raw_text',
  'last_verified_at',
  'countdown_raw',
] as const;

export type PublicScholarship = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly provider: string | null;
  readonly university: string | null;
  readonly country_iso2: string | null;
  readonly level: string | null;
  readonly fields: readonly string[];
  readonly funding_type: string;
  readonly cycle_label: string | null;
  readonly official_url: string;
  readonly application_url: string | null;
  readonly source_url: string;
  readonly source_licence: string;
  readonly internal_status: InternalStatus;
  readonly status_reason: string;
  readonly last_known_status: InternalStatus | null;
  readonly last_known_status_at: string | null;
  readonly opening_date: string | null;
  readonly deadline_at: string | null;
  readonly deadline_basis: DeadlineBasis;
  readonly deadline_precision: DeadlinePrecision;
  readonly deadline_tz: string | null;
  readonly deadline_raw_text: string | null;
  readonly last_verified_at: string | null;
  /**
   * Segundos para `MINUTE`/`HOUR`, días naturales para `DATE`, `null` si no
   * aplica. No es un `interval`: en el cliente sería texto. Interpretar este
   * número fuera de `countdownFromView()` es el error que ya produjo un
   * "1 h" constante en toda la web de resultados.
   */
  readonly countdown_raw: number | null;
};

const SELECT_CLAUSE = PUBLIC_FIELDS.map((f) => `s.${f}`).join(', ');

export type SearchFilters = {
  readonly q?: string | undefined;
  readonly country?: string | undefined;
  readonly level?: string | undefined;
  readonly status?: readonly InternalStatus[] | undefined;
  readonly windowDays?: number | undefined;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
};

export type SearchResult = {
  readonly items: readonly PublicScholarship[];
  readonly total: number;
  readonly hasMore: boolean;
};

export async function searchScholarships(
  filters: SearchFilters,
): Promise<SearchResult> {
  if (!isDatabaseConfigured()) return { items: [], total: 0, hasMore: false };

  const db = getDb();
  // Tope de longitud: `ILIKE '%…%'` no puede usar índice, así que un texto
  // enorme degrada la consulta sin ganar nada. 200 caracteres bastan para un
  // nombre de programa.
  const rawQuery = filters.q?.trim() ?? null;
  const q = rawQuery === null || rawQuery === '' ? null : rawQuery.slice(0, 200);
  const statuses = filters.status ?? ['OPEN', 'UPCOMING', 'UNKNOWN', 'EXPIRED'];
  const safeLimit = Math.min(Math.max(filters.limit ?? 24, 1), 100);
  const safeOffset = Math.max(filters.offset ?? 0, 0);

  // El WHERE se repite literal en el COUNT: un predicado construido aparte
  // por los dos lados podría divergir sin que nada lo detecte, y el `total`
  // dejaría de cuadrar con lo que la lista muestra.
  const rows = await db`
    SELECT ${sql.unsafe(SELECT_CLAUSE)},
           count(*) OVER () AS total_count
      FROM v_scholarships_public s
     WHERE s.internal_status = ANY(${statuses as string[]})
       AND (${filters.country ?? null}::text IS NULL OR s.country_iso2 = ${filters.country ?? null})
       AND (${filters.level ?? null}::text   IS NULL OR s.level        = ${filters.level ?? null})
       AND (
         ${filters.windowDays ?? null}::int IS NULL
         OR (s.deadline_basis = 'publisher_stated'
             AND s.deadline_at IS NOT NULL
             AND s.deadline_at <= now() + (${filters.windowDays ?? null}::int * interval '1 day'))
       )
       AND (
         ${q}::text IS NULL
OR s.search_tsv @@ plainto_tsquery('simple', public.f_unaccent(${q}))
          OR public.f_unaccent(s.title) ILIKE '%' || public.f_unaccent(${q}) || '%'
       )
     ORDER BY (s.countdown_raw IS NULL), s.countdown_raw ASC NULLS LAST, s.title ASC
     LIMIT ${safeLimit + 1} OFFSET ${safeOffset}
  `;
  // `limit + 1` en vez de comparar `length === limit`: con exactamente `limit`
  // resultados no se puede distinguir "página llena" de "última página", y el
  // botón "cargar más" llevaría a una página vacía.
  const hasMore = rows.length > safeLimit;
  const items = rows.slice(0, safeLimit);
  return {
    items: items.map(projectRow),
    // La ventana cuenta la página actual, no el corpus entero. Cuando la página
    // viene vacía el total es 0, no el número real: es el único dato que se
    // puede saber sin una segunda consulta.
    total: Number(items[0]?.total_count ?? 0),
    hasMore,
  };
}

/**
 * Proyecta la fila de la vista al tipo público. El `id` interno y los campos de
 * diagnóstico (`status_confidence`, `preserve_lastKnown`) no viajan: no son
 * secretos, pero no aportan nada al usuario y amplían la superficie.
 */
function projectRow(row: Record<string, unknown>): PublicScholarship {
  const projected: Record<string, unknown> = {};
  for (const field of PUBLIC_FIELDS) projected[field] = row[field] ?? null;
  return projected as unknown as PublicScholarship;
}

export async function getScholarshipBySlug(
  slug: string,
): Promise<PublicScholarship | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const rows = await db`
    SELECT ${sql.unsafe(SELECT_CLAUSE)}
      FROM v_scholarships_public s
     WHERE s.slug = ${slug}
     LIMIT 1
  `;
  return rows.length === 0 ? null : projectRow(rows[0]);
}

export type CorpusStats = {
  readonly published: number;
  readonly byStatus: Readonly<Record<string, number>>;
  readonly byCountry: ReadonlyArray<{ country_iso2: string; count: number }>;
  readonly lastVerifiedAt: string | null;
};

export async function getCorpusStats(): Promise<CorpusStats> {
  if (!isDatabaseConfigured()) {
    return { published: 0, byStatus: {}, byCountry: [], lastVerifiedAt: null };
  }
  const db = getDb();
  const rows = await db<{ published: number; open: number; last_verified_at: string | null }[]>`
    SELECT
      count(*)::int AS published,
      count(*) FILTER (WHERE internal_status = 'OPEN')::int AS open,
      max(last_verified_at) AS last_verified_at
    FROM v_scholarships_public
  `;
  const countries = await db<Array<{ country_iso2: string; count: number }>>`
    SELECT country_iso2, count(*)::int AS count
      FROM v_scholarships_public
     WHERE country_iso2 IS NOT NULL
     GROUP BY country_iso2
     ORDER BY count DESC, country_iso2 ASC
     LIMIT 60
  `;
  const row = rows[0];
  return {
    published: row?.published ?? 0,
    byStatus: { OPEN: row?.open ?? 0 },
    byCountry: countries,
    lastVerifiedAt: row?.last_verified_at ?? null,
  };
}

export type SourceStatusRow = {
  readonly id: string;
  readonly name: string;
  readonly homepage: string;
  readonly licence: string;
  readonly legal_clearance: string;
  readonly health_status: string;
  readonly last_fetch_at: string | null;
  readonly count: number;
};

/** Metodología pública: de dónde sale cada registro y cuándo se verificó. */
export async function getSourceTransparency(): Promise<readonly SourceStatusRow[]> {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  return db<SourceStatusRow[]>`
    SELECT src.id, src.name, src.homepage, src.licence, src.legal_clearance,
           src.health_status, src.last_fetch_at, count(s.id)::int AS count
      FROM sources src
      LEFT JOIN v_scholarships_public s ON s.source_id = src.id
     GROUP BY src.id, src.name, src.homepage, src.licence,
              src.legal_clearance, src.health_status, src.last_fetch_at
     ORDER BY count DESC, src.name ASC
  `;
}

export type { SourceStatus };
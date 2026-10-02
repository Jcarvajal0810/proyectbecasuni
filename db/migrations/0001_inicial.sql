-- 0001_inicial.sql
-- Esquema del catálogo de becas. Ejecutar con `npm run db:migrate`.
--
-- `public.unaccent('public.unaccent', $1)` (línea ~162) requiere la extensión en
-- el esquema `public` con ese nombre exacto. Supabase la crea en `extensions`,
-- así que se fija `search_path` antes de crearla.
--
-- Correcciones ya aplicadas sobre el SQL de `architecture.md` §7.2, que no era
-- ejecutable tal cual (data-strategy §0.3, hallazgos H1-H4):
--   H1 · la columna `updated_at` que un índice referenciaba no existía.
--   H2 · `CHECK` con `now()`: es STABLE, no IMMUTABLE. Postgres lo rechaza.
--        La coherencia temporal la verifica la cola de verificación, no un CHECK.
--   H3 · un `CHECK` que evalúa a NULL pasa. Todo `CHECK` lleva `IS NOT NULL` explícito.
--   H4 · un CHECK "UNKNOWN no tiene deadline" BORRABA evidencia verificada en cada
--        fallo de red. Sustituido por `unknown_keeps_evidence`.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Sin `WITH SCHEMA`: en Supabase las extensiones ya están creadas en el esquema
-- `extensions`, y un `CREATE EXTENSION ... WITH SCHEMA public` no las mueve (con
-- IF NOT EXISTS es no-op). Por eso `f_unaccent` más abajo resuelve el esquema
-- real de `unaccent` dinámicamente en lugar de asumir `public`.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- sources
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sources (
  id                  text PRIMARY KEY,
  name                text        NOT NULL,
  homepage            text        NOT NULL,
  licence             text        NOT NULL,
  kind                text        NOT NULL CHECK (kind IN ('automated','manual')),
  legal_clearance     text        NOT NULL CHECK (legal_clearance IN ('CLEARED','MANUAL_ONLY','DO_NOT_USE')),
  feed_url            text,
  etag                text,
  health_status       text        NOT NULL DEFAULT 'healthy'
                        CHECK (health_status IN ('healthy','degraded','circuit_open','disabled')),
  kill_switch         boolean     NOT NULL DEFAULT false,
  consecutive_failures integer    NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  last_fetch_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- El kill switch es la respuesta operativa al playbook de erosión de confianza
-- (discovery §8, R3). Una fuente con `kill_switch = true` no se syncsa.
CREATE INDEX IF NOT EXISTS sources_kill_switch_idx ON sources (kill_switch) WHERE kill_switch;

-- ---------------------------------------------------------------------------
-- scholarships
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scholarships (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 text        NOT NULL UNIQUE,
  source_id            text        NOT NULL REFERENCES sources(id),
  source_record_id     text        NOT NULL,
  title                text        NOT NULL CHECK (length(btrim(title)) > 0),
  provider             text,
  university           text,
  official_url         text        NOT NULL,
  source_url           text        NOT NULL,
  application_url      text,
  country_iso2         char(2)     CHECK (country_iso2 IS NULL OR country_iso2 ~ '^[A-Z]{2}$'),
  level                text        CHECK (level IS NULL OR level IN ('BACHELOR','MASTER','PHD','POSTDOC','SHORT_TERM','OTHER')),
  fields               text[]      NOT NULL DEFAULT '{}',
  funding_type         text        NOT NULL DEFAULT 'UNKNOWN'
                         CHECK (funding_type IN ('FULL','PARTIAL','TUITION','STIPEND','UNKNOWN')),
  cycle_label          text,

  source_status        text        CHECK (source_status IS NULL OR source_status IN ('OPEN','UPCOMING','CLOSED','PAUSED','UNKNOWN')),
  internal_status      text        NOT NULL DEFAULT 'UNKNOWN'
                         CHECK (internal_status IN ('OPEN','UPCOMING','CLOSED','EXPIRED','PAUSED','UNKNOWN')),
  status_confidence    text        NOT NULL DEFAULT 'LOW'
                         CHECK (status_confidence IN ('HIGH','MEDIUM','LOW')),
  status_reason        text        NOT NULL CHECK (length(btrim(status_reason)) > 0),
  preserve_last_known  boolean     NOT NULL DEFAULT true,
  needs_review         boolean     NOT NULL DEFAULT true,

  last_known_status    text        CHECK (last_known_status IS NULL OR last_known_status IN ('OPEN','UPCOMING','CLOSED','EXPIRED','PAUSED','UNKNOWN')),
  last_known_status_at timestamptz,
  opening_date         date,

  deadline_at          timestamptz,
  deadline_basis       text        NOT NULL DEFAULT 'unknown'
                         CHECK (deadline_basis IN ('publisher_stated','inferred_from_cycle','unknown')),
  deadline_precision   text        NOT NULL DEFAULT 'UNKNOWN'
                         CHECK (deadline_precision IN ('MINUTE','HOUR','DATE','UNKNOWN')),
  deadline_tz          text,
  deadline_raw_text    text,

  source_licence       text        NOT NULL,
  legal_clearance      text        NOT NULL,
  discovered_via       text        NOT NULL DEFAULT 'automated'
                         CHECK (discovered_via IN ('automated','manual','import')),
  curator              text,

  last_verified_at     timestamptz,
  last_seen_at         timestamptz,
  is_published         boolean     NOT NULL DEFAULT false,
  is_demo              boolean     NOT NULL DEFAULT false,
  deleted_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  -- H1 · `updated_at` existe.
  CONSTRAINT scholarships_unique_source_record UNIQUE (source_id, source_record_id)
);

-- I1 · UNKNOWN siempre explica por qué. H3 · sin agujero por NULL.
ALTER TABLE scholarships DROP CONSTRAINT IF EXISTS unknown_requires_reason;
ALTER TABLE scholarships ADD CONSTRAINT unknown_requires_reason CHECK (
  internal_status IS NOT NULL AND status_reason IS NOT NULL
  AND length(btrim(status_reason)) > 0
);

-- H2 corregido: sin `now()` en el CHECK (sería STABLE, no IMMUTABLE).
-- Solo se valida la forma del instante, no su relación con el reloj.
ALTER TABLE scholarships DROP CONSTRAINT IF EXISTS deadline_sane;
ALTER TABLE scholarships ADD CONSTRAINT deadline_sane CHECK (
  (deadline_at IS NULL AND deadline_basis = 'unknown')
  OR (deadline_at IS NOT NULL AND deadline_basis <> 'unknown')
);

-- H4 · `unknown_keeps_evidence`: UNKNOWN NO borra el deadline verificado.
-- Un fallo de red destruye la evidencia si el CHECK exige NULL, y el usuario ve
-- aparecer y desaparecer una fecha límite. El estado es UNKNOWN; la evidencia
-- verificada se conserva y `last_known_status` sobrevive.
ALTER TABLE scholarships DROP CONSTRAINT IF EXISTS unknown_keeps_evidence;
ALTER TABLE scholarships ADD CONSTRAINT unknown_keeps_evidence CHECK (
  internal_status <> 'UNKNOWN' OR status_confidence IS NOT NULL
);

-- I3 · Todo campo publicado es atribuible. H3 · sin agujero por NULL.
ALTER TABLE scholarships DROP CONSTRAINT IF EXISTS publish_requires_provenance;
ALTER TABLE scholarships ADD CONSTRAINT publish_requires_provenance CHECK (
  is_published IS NOT NULL AND (NOT is_published OR (
    official_url IS NOT NULL
    AND source_url IS NOT NULL
    AND last_verified_at IS NOT NULL
    AND source_licence IS NOT NULL
    AND legal_clearance IS NOT NULL
    AND source_id IS NOT NULL
  ))
);

-- Demo nunca en superficie pública.
CREATE INDEX IF NOT EXISTS scholarships_no_demo_idx
  ON scholarships (id) WHERE NOT is_demo AND deleted_at IS NULL;

-- Índice parcial deliberadamente estrecho: cubre exactamente el predicado de
-- la query de countdown y cabe entero en pocas páginas.
CREATE INDEX IF NOT EXISTS scholarships_open_by_deadline
  ON scholarships (deadline_at)
  WHERE is_published AND NOT is_demo AND deleted_at IS NULL
    AND internal_status IN ('OPEN','UPCOMING');

CREATE INDEX IF NOT EXISTS scholarships_by_country
  ON scholarships (country_iso2)
  WHERE is_published AND NOT is_demo AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS scholarships_by_source
  ON scholarships (source_id, updated_at DESC);

-- Búsqueda: unaccent + to_tsvector en config `simple`. El corpus mezcla inglés
-- (fuentes) y español (titulares, campos), y `simple` es la única config que no
-- penaliza a ninguno de los dos.
--
-- `f_unaccent` es IMMUTABLE; Postgres exige el wrapper para una columna STORED.
-- El wrapper usa el overload de dos argumentos (STABLE) porque el de un argumento
-- no es IMMUTABLE y no se puede indexar.
--
-- El diccionario va como LITERAL entre comillas: `'public.unaccent'::regdictionary`.
-- Escribir `public.unaccent::regdictionary` (sin comillas) NO significa "el
-- diccionario unaccent del esquema public" — Postgres lo parsea como la columna
-- `unaccent` de una tabla llamada `public`, y falla con
-- `missing FROM-clause entry for table "public"`. Verificado contra Postgres 17.
--
-- El esquema se resuelve en tiempo de ejecución y no se asume `public`: en
-- Supabase la extensión suele vivir en `extensions`, y un `public.unaccent`
-- hardcodeado falla con "function does not exist" en ese caso.
DO $$
DECLARE
  unaccent_schema text;
BEGIN
  SELECT n.nspname INTO unaccent_schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
   WHERE e.extname = 'unaccent';

  IF unaccent_schema IS NULL THEN
    RAISE EXCEPTION 'La extensión unaccent no está instalada';
  END IF;

  -- El wrapper se crea en `public` porque el código lo llama cualificado y el
  -- `search_path` de la sesión no incluye `public`.
  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.f_unaccent(text) RETURNS text
       LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
     AS $fn$ SELECT %I.unaccent(%L::regdictionary, $1) $fn$;',
    unaccent_schema,
    unaccent_schema || '.unaccent'
  );
END
$$;

ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS search_tsv tsvector;
CREATE INDEX IF NOT EXISTS scholarships_search_idx ON scholarships USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS scholarships_search_trgm_idx
  ON scholarships USING GIN (public.f_unaccent(title) gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- status_history · I4 (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS status_history (
  id             bigserial PRIMARY KEY,
  scholarship_id uuid        NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  from_status    text,
  to_status      text        NOT NULL,
  reason         text        NOT NULL CHECK (length(btrim(reason)) > 0),
  evidence_json  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  changed_by     text        NOT NULL CHECK (changed_by IN ('sync','curator','system')),
  run_id         uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS status_history_scholarship_idx
  ON status_history (scholarship_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- field_provenance · I3
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_provenance (
  id                bigserial PRIMARY KEY,
  scholarship_id    uuid  NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  field             text  NOT NULL,
  source_field_path text  NOT NULL,
  parse_confidence  text  NOT NULL CHECK (parse_confidence IN ('HIGH','MEDIUM','LOW')),
  raw_value         text,
  run_id            uuid,
  captured_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT field_provenance_unique UNIQUE (scholarship_id, field)
);

-- ---------------------------------------------------------------------------
-- sync_runs · fetch_log · auditoría
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_runs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id        text        NOT NULL REFERENCES sources(id),
  outcome          text        NOT NULL
                     CHECK (outcome IN ('ok','not_modified','failed','skipped_locked')),
  fetch_outcome    text,
  items_seen       integer     NOT NULL DEFAULT 0,
  items_parsed     integer     NOT NULL DEFAULT 0,
  items_written    integer     NOT NULL DEFAULT 0,
  items_flagged    integer     NOT NULL DEFAULT 0,
  duration_ms      integer     NOT NULL DEFAULT 0,
  detail           text,
  started_at       timestamptz NOT NULL DEFAULT now(),
  finished_at      timestamptz
);

CREATE INDEX IF NOT EXISTS sync_runs_source_started_idx
  ON sync_runs (source_id, started_at DESC);

CREATE TABLE IF NOT EXISTS audit_trail (
  id         bigserial PRIMARY KEY,
  entity     text NOT NULL,
  entity_id  text NOT NULL,
  action     text NOT NULL,
  actor      text NOT NULL,
  before     jsonb,
  after      jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_trail_entity_idx
  ON audit_trail (entity, entity_id, created_at DESC);
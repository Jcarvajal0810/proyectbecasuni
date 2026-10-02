-- 0002_read_model.sql
-- Read model público. Allowlist de campos (data-strategy §2.10).
--
-- Dos reglas que esta vista hace cumplir y que la tabla NO puede:
--   1 · `is_demo` y `deleted_at` nunca salen.
--   2 · El countdown solo existe con `deadline_basis = 'publisher_stated'`.
--      Un deadline `inferred_from_cycle` es NUESTRO estimate: un "3 días"
--      sobre él sería precisión inventada, y R6 lo prohíbe explícitamente.

CREATE OR REPLACE VIEW v_scholarships_public AS
SELECT
  id,
  slug,
  title,
  provider,
  university,
  country_iso2,
  level,
  fields,
  funding_type,
  cycle_label,
  official_url,
  application_url,
  source_url,
  source_licence,
  source_status,
  internal_status,
  status_confidence,
  status_reason,
  last_known_status,
  last_known_status_at,
  opening_date,
  deadline_at,
  deadline_basis,
  deadline_precision,
  deadline_tz,
  deadline_raw_text,
  last_verified_at,
  is_demo,
  is_published,
  source_id,
  search_tsv,

  -- Derivado de deadline. CASE con WHEN: si CUALQUIER condición falla → NULL,
  -- nunca 0. Un "0 días" con horas restantes es el bug de R6.
  CASE
    WHEN internal_status NOT IN ('OPEN','UPCOMING')            THEN NULL
    WHEN deadline_at IS NULL                                    THEN NULL
    WHEN deadline_basis <> 'publisher_stated'                   THEN NULL
    WHEN deadline_precision = 'UNKNOWN'                         THEN NULL
    WHEN deadline_tz IS NULL                                    THEN NULL
    WHEN deadline_at <= now()                                   THEN NULL
    -- MINUTE/HOUR → segundos enteros, NO un `interval`. Postgres devuelve
    -- `interval` para `timestamptz - timestamptz`, y eso llega al cliente como
    -- texto ("18:00:00"), no como número: el tipo declarado `number` sería una
    -- mentira y el countdown se rompería en silencio.
    -- GREATEST(1, ...) aplica el mismo mínimo que en días: nunca 0 sobre un
    -- deadline vivo.
    WHEN deadline_precision IN ('MINUTE','HOUR')
      THEN GREATEST(
        floor(EXTRACT(EPOCH FROM (deadline_at - now())))::int,
        1
      )
    WHEN deadline_precision = 'DATE'
      THEN GREATEST(
        ((deadline_at AT TIME ZONE deadline_tz)::date
         - (now()     AT TIME ZONE deadline_tz)::date)::int,
        -- Mínimo 1 día mientras el deadline siga vivo. Sin este mínimo, un
        -- deadline HOY a las 23:59 con 12 h restantes devuelve 0: el "0 días"
        -- que U1 reporta como motivo de abandono y que R6 prohíbe.
        1
      )
  END AS countdown_raw

FROM scholarships
WHERE is_published
  AND NOT is_demo
  AND deleted_at IS NULL
  AND legal_clearance IN ('CLEARED','MANUAL_ONLY');

-- Cola de re-verificación derivada, no columna almacenada (DS-07): una columna
-- de caducidad es un flag que se desincroniza del `last_verified_at` que la
-- justifica. La prioridad depende de qué campo de confianza es más viejo.
CREATE OR REPLACE VIEW v_records_needing_reverification AS
SELECT
  s.id,
  s.slug,
  s.source_id,
  s.title,
  s.last_verified_at,
  s.last_seen_at,
  COALESCE(src.health_status, 'healthy') AS health_status,
  EXTRACT(DAY FROM (now() - s.last_verified_at))::int AS age_days,
  CASE
    WHEN s.deadline_basis = 'publisher_stated'
      AND s.deadline_at IS NOT NULL
      AND s.deadline_at < now() + interval '14 days'      THEN 0   -- P0 · deadline próximo/pasado
    WHEN s.status_confidence = 'LOW'
      AND s.last_verified_at < now() - interval '3 days'   THEN 1   -- P1 · confianza baja
    WHEN s.last_verified_at < now() - interval '7 days'                   THEN 2   -- P2
    WHEN s.last_verified_at < now() - interval '30 days'                  THEN 3   -- P3
    ELSE NULL
  END AS priority
FROM scholarships s
JOIN sources src ON src.id = s.source_id
WHERE s.is_published
  AND NOT s.is_demo
  AND s.deleted_at IS NULL
  AND NOT src.kill_switch;
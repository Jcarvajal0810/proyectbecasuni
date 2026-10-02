# FASE 7 — Technical Blueprint
> **Proyecto:** becas internacionales verificables (search-first).  
> **Estado:** Sin código de implementación. Solo diseño técnico.  
> **Fuentes de verdad:** `discovery/discovery.md`, `architecture/architecture.md`, `value-impact/value-impact-refinement.md`, `data-strategy/data-strategy.md`, `ux/ux-strategy.md`, `design/visual-direction.md`, `discovery/legal-matrix.md`, `discovery/security-baseline.md`.  
> **Principio rector:** Dataset trazable. No agregador masivo. Verificabilidad (`source_url` + `last_verified_at`) prevalece sobre volumen.

## 1. Stack definitivo (Opción A: todo en Vercel)

**Opción seleccionada:** Opción A (Todo en Vercel), con encapsulamiento estricto de la frontera de fetch para poder migrar a Opción C sin reescribir adapters (ADR-003, architecture §11.3).

| Tecnología | Uso | Por qué |
|---|---|---|
| **Next.js 14+ (App Router)** | Frontend + API (Route Handlers) | Un solo despliegue, RSC para catálogo público cacheable, Server Actions no necesarias. Alineado con brief y arquitectura L2. |
| **TypeScript (strict)** | Lenguaje base | Tipado estricto para contratos (`core/models`, `adapters/contracts`). Evita fugas de campos internos. |
| **Tailwind CSS** | Estilos | Consistente con UX (mobile-first), evita CSS global innecesario. |
| **shadcn/ui** | Componentes base accesibles | Accesibilidad por construcción (WCAG 2.2 AA). Reduce componentes ad-hoc. |
| **Motion (Framer Motion)** | Microinteracciones | Solo donde explica cambio de estado (UX §6). Respeta `prefers-reduced-motion`. No decorativo. |
| **React Three Fiber (R3F)** | 3D (post-MVP) | **No dependencia de MVP**. Solo se habilita si se cumplen los 4 criterios de `discovery §2.1` (≥500 regs ≥40 países, mejora medible frente 2D, móvil útil con fallback 2D, no oculta gaps). |
| **@react-three/drei** | Utils R3F | Solo post-MVP, con las mismas condiciones. |
| **Postgres** | Base de datos | Única fuente de verdad. Soporta FTS (tsvector+GIN), CHECKs, PITR, advisory locks. |
| **Neon/Supabase (Postgres gestionado)** | DB alojada | Pooling gestionado, PITR, cercano a región Vercel. Elección entre ambos por región/coste (Q-B). |
| **QStash** | Triggers de sync | Disparador con retries, backoff, firma HMAC. Evita motor genérico de jobs (descartado §2.2). Route Handler firmado. |
| **Route Handlers (Next.js)** | API | Única superficie HTTP. Serialización por allowlist. Auth interno HMAC. |
| **Sentry** | Observabilidad (errores/perf) | Errores sync/render, tracing. Detecta "sistema parece vivo y no lo está". |
| **PostHog** | Analytics producto (first-party) | Funnel `search_submitted→detail_viewed→source_outbound_click` (M1). Sin PII, sin queries crudas, replay desactivado. EU/cloud según Q-D. |

**Nota stack:** R3F/drei fuera de MVP (ADR-001). Embeddings descartados en MVP (Q5, reevaluar solo M2>10% y M1≥40%).

## 2. Ambientes, configuración y secretos

### 2.1 Ambientes
| Ambiente | Propósito | Datos | Despliegue |
|---|---|---|---|
| **dev** | Desarrollo local | Solo demo | Local (Next dev) |
| **staging** | Preproducción/integración | Solo demo | Vercel Preview (branch) |
| **prod** | Producción | Solo reales (`is_demo=false`) | Vercel Production (rama principal) |

**Regla demo/real (architecture §12):** `is_demo` inmutable, badge obligatorio, prod sin demo. Seed demo aborta si `NODE_ENV=production`.

### 2.2 Variables de entorno (`.env.example` server-only)

> **Prohibición estricta:** Sin `NEXT_PUBLIC_*` para secretos. Validado en CI. Secrets únicamente server-side.

```env
# Aplicación
NODE_ENV=production|staging|development
APP_URL=https://<dominio-prod>

# Base de datos (server-only)
DATABASE_URL=postgresql://<user>:<pass>@<host>/<db>?sslmode=require
DATABASE_POOL_URL=postgresql://<user>:<pass>@<pool-host>/<db>?sslmode=require

# Jobs / QStash (firmados HMAC)
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=<server-only>
QSTASH_CURRENT_SIGNING_KEY=<server-only>
QSTASH_NEXT_SIGNING_KEY=<server-only>
SYNC_TOKEN_HMAC=<server-only>        # token firmado endpoints internos
ADMIN_TOKEN_HMAC=<server-only>       # distinto de sync (least privilege)

# Observabilidad
SENTRY_DSN=<server-only>
SENTRY_ENVIRONMENT=production|staging|dev
SENTRY_TRACES_SAMPLE_RATE=0.1
POSTHOG_KEY=<server-only>
POSTHOG_HOST=https://eu.i.posthog.com  # o self-host EU

# Feature flags / entorno
ENABLE_R3F=false                      # solo post-MVP
ENABLE_DEMO_SEED=false                # nunca true en prod
```

**Gestión de secretos:** .env* gitignored, solo `.env.example` commiteado. Rotación con owner por secreto. Fail-closed si falta secreto.

### 2.3 Seguridad de configuración
- Sin credenciales en bundle. Validación de entorno en arranque (fail-fast).
- `ENABLE_DEMO_SEED` protegido: aborta si `NODE_ENV==='production'`.
- Tokens HMAC distintos (sync ≠ admin). Comparación en tiempo constante.
- Permisos mínimos DB (rol `app_readonly` sobre vistas, rol `ingest_write` sobre escritura append-only).

## 3. Contratos, arquitectura de módulos y frontera de fetch

### 3.1 Estructura de módulos (alineado architecture §6)
```text
src/
├── adapters/                    # ÚNICA zona con permiso de socket (salida)
│   ├── registry.ts              # endpoints + allowlists (SSRF audit aquí)
│   ├── contracts.ts             # SourceAdapter, descriptor, SafeHttpClient
│   └── eacea-emjmd/
│       ├── adapter.ts
│       ├── descriptor.ts         # legal_clearance obligatorio (B6)
│       ├── parse.ts              # XML estricto, XXE off
│       └── map.ts                # NormalizedScholarship
├── core/                        # PURA: sin fetch, DB, fs, clock, next/*
│   ├── sync/
│   │   ├── orchestrator.ts      # pipeline §4.4, P0–P3, budgets
│   │   ├── priority-queue.ts
│   │   └── run-ledger.ts
│   ├── normalizers/, validators/, status/, dedup/, deadlines/, models/
├── db/
│   ├── schema/migrations
│   ├── repositories/            # ÚNICA capa SQL
│   ├── unit-of-work.ts
│   └── outbox/
├── api/
│   ├── routes/                  # App Router Route Handlers
│   ├── serializers/             # ALLOWLIST serialización (§10.6)
│   ├── middleware/              # auth HMAC, rate limit, CORS, request-id
│   └── read-models/             # búsqueda, detalle, metodología
└── web/                         # RSC/UI (solo consume serializers)
```

**Regla de dependencias (verificable CI):** `core/` NO importa `adapters/`, `db/`, `fetch`, `next/*`. `adapters/` → `core/`. `api/` → `db/`, `core/` (solo read-pure). `web/` → solo lo expuesto por serializers.

### 3.2 Frontera de fetch: puerto vinculado (ADR-003)

**Principio:** Adapter pide `endpointId`, nunca URL. `SafeHttpClient` inyectado (composition root).

```ts
// ScopedRequest (resumen)
interface ScopedRequest {
  endpointId: string;                // pre-registrado, allowlist exacta
  priority: 'P0'|'P1'|'P2'|'P3';
  reason: 'scheduled'|'reverify'|'priority'|'manual';
  ifNoneMatch?: string;
  ifModifiedSince?: IsoTimestamp;
}
```

**Secuencia SSRF obligatoria (architecture §10.2):**
1. endpointId → URL desde registro (nunca datos)
2. scheme+host vs allowlist exacta (sin comodines)
3. Resolver DNS → **todas** A/AAAA
4. Validar cada IP vs listas bloqueo (loopback/RFC1918/CGNAT/169.254.169.254/multicast/reservados)
5. Elegir IP validada → **conectar fijando esa IP** (pin), conservar SNI + Host
6. Cada redirect: repetir 2–6. `followRedirects=false` por defecto (máx. 3 saltos si necesario)

**Límites por adapter (defaults MVP):**
| Límite | Valor | Notas |
|---|---|---|
| connectTimeoutMs | 5000 | |
| totalTimeoutMs | 20000–30000 | deadline por run 5 min |
| maxResponseBytes | 5MB | RSS |
| maxDecompressedBytes | 10MB | zip/gzip bomb |
| maxRedirectHops | 0 (default) | ≤3 solo justificado |
| maxConcurrentPerHost | 1 | |
| minIntervalMs | ≥2000 + jitter | backoff exponencial+jitter |
| allowedSchemes | ['https:'] preferido | http: solo justificado |
| allowedContentTypes | allowlist por endpoint | challenge_page detectado, no parseado |

**User-Agent:** descriptivo con contacto real. Cumplimiento `robots.txt` (no licencia). Sin evasión CAPTCHA.

## 4. Sync/jobs, cola P0–P3, locks, budgets

### 4.1 Cola de prioridad y re-verificación (DS-07)
Orden por riesgo (no antigüedad sola): `P0 > P1 > P2 > P3`.

| Prioridad | Criterio | Razón |
|---|---|---|
| **P0** | Registros con `needs_review=true`, deadline inminente (<7–14 días según ciclo), o `internal_status='UNKNOWN'` y `source_status IN ('OPEN','UPCOMING')` (M5) | Acción crítica (riesgo reputacional) |
| **P1** | Próximos a vencer (ventana pre-deadline), cambios detectados previamente | Evitar degradar registros accionables |
| **P2** | Stale según `freshness_window_days` (vista `v_records_needing_reverification`) | M4 |
| **P3** | Expirados/archivados, bajo riesgo | Mantenimiento |

**Re-verificación:** derivada por vista (no columna almacenada). Usa `sources.freshness_window_days` por fuente (cadencia por volatilidad legal-matrix §11).

### 4.2 Triggers y orquestación
- **QStash:** cron por fuente + eventos. Invoca Route Handler firmado (`SYNC_TOKEN_HMAC`, HMAC con expiración, comparación tiempo constante).
- **pg_try_advisory_xact_lock** por `source_id`: evita carreras (AR-6). Segundo run → `outcome='skipped_locked'`, no fallo.
- **Presupuesto por run:** `maxRequests`, `maxBytes`, `deadlineMs`. `budget_exhausted` → `UNKNOWN` + `preserveLastKnown=true`, `needs_review=false` (F-16).
- **Single-flight + circuit breaker** por dominio/fuente. Backoff exponencial + jitter completo. Respeta `Retry-After`.

### 4.3 Pipeline (architecture §4.4) — etapas obligatorias
1. **SOURCE** (descriptor): `legal_clearance` obligatorio. Si falta → adapter no monta.
2. **FETCH** (único socket): `SafeHttpClient.fetchScoped`. `ETag`/`If-Modified-Since` → `304 not_modified` (no actualiza `last_verified_at`, sí `last_seen_at`).
3. **PARSE**: XML estricto, XXE off, límites profundidad/tamaño. `parse_ok`.
4. **NORMALIZE**: → `NormalizedScholarship`, enums allowlist, `null` explícito (no inventar).
5. **VALIDATE**: sanity + required → `ValidationResult` (`safeToPersist`, `publishable`). Violación BLOCKING → `needs_review=true`, conserva valor bueno previo.
6. **DEDUP**: identidad fuerte (URL canónica + título normalizado + `external_id`). Conservador: conflicto → `possible_duplicate_of`, **nunca merge automático**.
7. **COMPARE**: diff campo-a-campo → decide cambios.
8. **UPDATE**: conjunto escritura en memoria (sin DB).
9. **RECALC**: `resolveStatus(evidence)` **puro** (inyecta `now`), calcula freshness, elegibilidad countdown.
10. **PERSIST**: **1 transacción única** (rows + provenance + audit + status_history + sync_run + record_versions). Atomicidad total.

### 4.4 Logging y evidencia
- `sync_runs`: outcome, `parse_ok`, `status_extracted`, `records_seen/changed`, `needs_review_count`, `error_code` (sin payload crudo), `error_class` no público.
- `fetch_log`: append-only. `decision`, `reason`, `resolved_ip` (inet, NO NULL si `fetch`), `etag`, bytes, duration_ms, host/url.
- `field_provenance`: UPSERT por `(scholarship_id,field_name)`, `source_field_path`, `method` (auto/curator), `curator` si humano.
- `status_history`, `audit_trail`, `record_versions`: append-only (triggers). `status_history` FK `ON DELETE RESTRICT`.

## 5. API (Route Handlers), serialización, rate limit, auth interno

### 5.1 Endpoints (App Router)
| Ruta | Método | Público | Auth | Notas |
|---|---|---|---|---|
| `/api/search` | GET | Sí | Ninguno | Búsqueda + filtros. Lee `v_scholarships_public`. Paginación limit 20/max 100. |
| `/api/scholarships/[slug]` | GET | Sí | Ninguno | Detalle. Solo publicados/no demo/no borrados. |
| `/api/shortlist` | GET/POST | Sí (anónimo) | Token anónimo (token_hash derivado) | Ownership por `token_hash` (SHA-256). Sin PII. Scoping query `WHERE token_hash=:h`. IDOR tests obligatorios. |
| `/api/shortlist/share` | POST | Sí | Token anónimo | Genera `share_slug` aleatorio (≥128 bits), `expires_at`. Solo lectura. |
| `/api/share/[slug]` | GET | Sí | Ninguno (solo lectura) | Shortlist compartido. Requiere válido/no expirado. |
| `/api/metodology` | GET | Sí | Ninguno | Lee `v_metrics_dashboard` (excluye `is_demo` siempre). |
| `/api/sources` | GET | Sí | Ninguno | Fuentes + atribución. |
| `/api/corrections` | POST | Sí | Ninguno | Encola `needs_review=true` + `needs_review_reason`. Sin cuenta. |
| `/api/internal/sync/run` | POST | No (interno) | **HMAC firmado** (`SYNC_TOKEN_HMAC`) | Disparado QStash. Fail-closed. Comparación tiempo constante. |
| `/api/internal/sync/health` | GET | No | HMAC (`ADMIN_TOKEN_HMAC`) | Salud fuentes (M7). |

### 5.2 Serialización allowlist (obligatoria)

**Nunca `NextResponse.json({...row})`**. Mapper campo-a-campo (`api/serializers/`).

**Allowlist pública (`v_scholarships_public`):**
`id, slug, title, provider, university, country_iso2, destination_countries, level, fields, modality, funding_type, amount, currency, coverage, duration_months, ects, official_url, application_url, source_url, source_name, source_licence, source_status, internal_status, status_confidence, status_reason, last_known_status, last_known_status_at, opening_date, deadline_at, deadline_basis, deadline_precision, deadline_tz, deadline_raw_text, last_verified_at, cycle_label, is_demo, countdown_raw` (y derivados presentación: `countdown_label`, `countdown_tone` calculados en capa presentación, nunca desde DB con lógica oculta).

**Campos NUNCA públicos:** `notes_internal, legal_clearance, needs_review, needs_review_reason, discovered_via, delete_reason, resolved_ip, error_class, curator, curated_at, content_hash, version`.

**Test CI obligatorio (§10.6 architecture):** ningún campo interno aparece en ninguna respuesta pública (búsqueda JSON stringify sobre todas rutas públicas).

### 5.3 Rate limiting, CORS, seguridad headers
- **Rate limit**: por IP (sliding window). Público: búsqueda 60–120 req/min, detalle menor, shortlist razonable. Interno: estricto + single-flight.
- **CORS**: allowlist orígenes (prod + staging). Sin `*` con credenciales. `Origin` reflejado solo si match.
- **Headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security` (HSTS), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictivo, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`. CSP estricto (sin `unsafe-inline`/`unsafe-eval`). **Trusted Types** (`require-trusted-types-for 'script'`) donde soporte.
- **Cache:** público cacheable (catálogo) con clave `método+path+query ordenada+locale`, **sin vary por cookie**. User-scoped: `private, no-store`. Nunca cachear respuestas con datos internos.
- **Idempotencia:** endpoints mutadores internos con claves idempotencia (QStash ya provee). Shortlist POST idempotente por token+scholarship.
- **Request-id** en logs + respuestas (X-Request-ID).

### 5.4 Auth interno HMAC
- Firma HMAC-SHA256 con `SYNC_TOKEN_HMAC`/`ADMIN_TOKEN_HMAC`, expiración corta, comparación tiempo constante, `fail-closed` (sin bypass dev en prod). Token sync ≠ admin (least privilege).
- Validación en middleware `api/middleware/auth-internal.ts`. Rechazo sin firma válida.

## 6. Base de datos/migraciones, CHECKs, índices, PITR/restore

### 6.1 Migraciones
Usar migraciones versionadas (schema/migrations). Orden §2.11 data-strategy:
1. Extensiones (`unaccent`; `pg_trgm` NO instalar MVP — DS-09)
2. Tablas base (`sources,countries,timezones,duplicate_groups`)
3. `scholarships` (sin FKs dependientes)
4. Backfill (NULL/honesto, nunca inventar)
5. FKs
6. Tablas hijas
7. Vistas (`v_scholarships_public`, `v_records_needing_reverification`, `v_source_health`, `v_open_records`, `v_metrics_dashboard`)
8. CHECKs
9. Triggers (append-only + is_demo_immutable) — después backfill
10. Índices (`CREATE INDEX CONCURRENTLY` producción)
11. GRANT/REVOKE (rol `app_readonly` solo sobre vistas)

### 6.2 CHECKs críticos (DB impone, no aplicación)
Aplicar correcciones H1–H4 data-strategy:

```sql
-- publish_requires_provenance (I1) — corrige NULL-passthrough
ALTER TABLE scholarships ADD CONSTRAINT publish_requires_provenance CHECK (
  is_published = false OR (
    source_url IS NOT NULL AND last_verified_at IS NOT NULL
    AND source_licence IS NOT NULL AND source_licence <> 'NONE'
    AND source_id IS NOT NULL
  )
);

-- unknown_requires_reason + pares
ALTER TABLE scholarships ADD CONSTRAINT unknown_requires_reason CHECK (
  internal_status IS DISTINCT FROM 'UNKNOWN' OR status_reason IS NOT NULL
);
ALTER TABLE scholarships ADD CONSTRAINT last_known_status_pair CHECK (
  last_known_status_at IS NULL OR last_known_status IS NOT NULL
);
ALTER TABLE scholarships ADD CONSTRAINT unknown_keeps_evidence CHECK (
  internal_status <> 'UNKNOWN' OR last_known_status IS NOT NULL OR last_verified_at IS NULL
);
ALTER TABLE scholarships ADD CONSTRAINT needs_review_has_reason CHECK (
  needs_review = false OR needs_review_reason IS NOT NULL
);

-- deadline sane (inmutable, corrige H2)
ALTER TABLE scholarships ADD CONSTRAINT deadline_sane CHECK (
  deadline_at IS NULL OR (
    deadline_at > timestamptz '2000-01-01 00:00:00+00'
    AND deadline_at < timestamptz '2100-01-01 00:00:00+00'
  )
);
ALTER TABLE scholarships ADD CONSTRAINT deadline_basis_required CHECK (
  deadline_at IS NULL OR deadline_basis <> 'unknown'
);
ALTER TABLE scholarships ADD CONSTRAINT deadline_precision_required CHECK (
  deadline_at IS NULL OR (deadline_precision <> 'UNKNOWN' AND deadline_tz IS NOT NULL)
);
ALTER TABLE scholarships ADD CONSTRAINT deadline_raw_text_required CHECK (
  deadline_at IS NULL OR deadline_raw_text IS NOT NULL
);
ALTER TABLE scholarships ADD CONSTRAINT deadline_ambiguous_date CHECK (
  deadline_at IS NULL OR deadline_date_order IS NOT NULL
);
ALTER TABLE scholarships ADD CONSTRAINT opening_before_deadline CHECK (
  opening_date IS NULL OR deadline_at IS NULL OR
  (deadline_at AT TIME ZONE 'UTC')::date >= opening_date
);

-- demo/duplicados
ALTER TABLE scholarships ADD CONSTRAINT demo_never_published CHECK (
  is_demo = false OR is_published = false
);
CREATE UNIQUE INDEX one_canonical_per_group
  ON duplicate_members (duplicate_group_id) WHERE is_canonical;
ALTER TABLE duplicate_members ADD CONSTRAINT one_group_per_scholarship UNIQUE (scholarship_id);

-- soft delete
ALTER TABLE scholarships ADD CONSTRAINT delete_requires_reason CHECK (
  deleted_at IS NULL OR delete_reason IS NOT NULL
);
ALTER TABLE scholarships ADD CONSTRAINT delete_requires_unpublish CHECK (
  deleted_at IS NULL OR is_published = false
);
```

### 6.3 Triggers (append-only + inmutabilidad)
```sql
CREATE FUNCTION block_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Tabla % append-only: % rechazado', TG_TABLE_NAME, TG_OP; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER status_history_append_only BEFORE UPDATE OR DELETE ON status_history FOR EACH ROW EXECUTE FUNCTION block_mutation();
CREATE TRIGGER audit_trail_append_only   BEFORE UPDATE OR DELETE ON audit_trail   FOR EACH ROW EXECUTE FUNCTION block_mutation();
CREATE TRIGGER fetch_log_append_only     BEFORE UPDATE OR DELETE ON fetch_log     FOR EACH ROW EXECUTE FUNCTION block_mutation();

CREATE TRIGGER is_demo_immutable
  BEFORE UPDATE OF is_demo ON scholarships
  FOR EACH ROW WHEN (OLD.is_demo IS DISTINCT FROM NEW.is_demo)
  EXECUTE FUNCTION block_mutation();
```

### 6.4 Índices (clave)
- `scholarships_fts` GIN (`search_vector`) — búsqueda
- `scholarships_open_by_deadline` btree parcial (deadline_at) WHERE published+no demo+status IN ('OPEN','UPCOMING')
- `scholarships_by_source_freshness` (source_id, last_verified_at DESC)
- `scholarships_public_listing` btree parcial (internal_status,deadline_at) WHERE publicados
- GIN `destination_countries`, `fields`
- `scholarships_needs_review`, `scholarships_stale` parciales
- `scholarships_possible_dup` WHERE possible_duplicate_of NOT NULL

`search_vector` generado STORED con `unaccent` + pesos A/B/C (spanish/simple). Ver disponibilidad extensión antes migración.

### 6.5 PITR, backup y restore drill
- **PITR obligatorio** (Neon/Supabase). Snapshot diario + WAL continuo según plan proveedor.
- **Restore drill agendado** (DoD M-14): probar restauración, medir RTO/RPO, acta con tiempos. Corpus curado no reproducible por pipeline (AR-14) → backup es activo crítico.
- **Soft delete + append-only** preservan historial. `status_history/audit_trail` con FK RESTRICT → no se borra evidencia por DELETE físico.
- **Export versionado corpus** (curación manual) para reconstrucción parcial si necesario.

## 7. Seguridad (SSRF-first, XSS, CSRF, IDOR)

### 7.1 SSRF (bloqueantes §6.3)
- Allowlist **exacta** por endpoint (sin comodines). Única entrada MVP: `eacea.ec.europa.eu`.
- DNS→todas A/AAAA→validar cada IP→**pin IP** (TOCTOU). Revalidar cada redirect.
- Listas bloqueo completas (loopback/RFC1918/CGNAT/169.254.169.254/link-local/multicast/reservados/ULA/6to4/Teredo).
- `followRedirects=false` default, ≤3 saltos, scheme revalidado.
- Tests negativos CI: 10 rangos + DNS-rebinding (C2). Cualquier fallo bloquea build/lanzamiento.

### 7.2 XSS/Render
- **Cero `dangerouslySetInnerHTML`** sobre contenido fuentes. Lint prohibe.
- Render texto por defecto. Sanitizador mantenido (allowlist) solo si HTML imprescindible (raro). Sanitizar ingest + defensivo render.
- CSP estricto: `default-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `frame-ancestors 'none'`, sin `unsafe-inline`/`unsafe-eval`. **Trusted Types** habilitado.
- Enlaces externos `target="_blank"` + `rel="noopener noreferrer"`. Validar href (`javascript:`, `data:`, `vbscript:` bloqueados).
- WebGL post-MVP: sin interpolar datos no confiables en GLSL, manejo `webglcontextlost`.

### 7.3 CSRF/Auth/IDOR
- Mutaciones internas con HMAC firmado. GET nunca muta.
- Shortlist: ownership por `token_hash` (SHA-256), scoping query `WHERE token_hash=:h`. **Tests IDOR horizontales** obligatorios (User A vs B) — C7.
- Cookies (si auth futuro): `HttpOnly`, `Secure`, `SameSite`, `__Host-`. CSRF tokens si cookie-auth.
- Secrets fail-closed. Comparación tiempo constante.

### 7.4 Datos/privacidad
- Serialización allowlist + test CI.
- `search_events.intent_key` truncado 120, sin PII. PostHog nunca recibe query cruda.
- Campos internos revocados (GRANT solo vistas). Caché `private,no-store` user-scoped.
- Retención: raw payloads acotados (validation_violations 90 días), logs append-only con propósito forense.

## 8. Rendimiento

### 8.1 Búsqueda/lecturas
- Postgres FTS con `tsvector` GIN (spanish+simple ponderado). `unaccent`.
- Vistas read-only (`v_scholarships_public`, `v_metrics_dashboard`). Sin N+1 (RSC + queries agregadas).
- Caché HTTP catálogo público (Cache-Control explícito). `is_demo=false` siempre en filtros.
- Paginación: limit 20, max 100. Evitar OFFSET profundo (keyset post-MVP si crece >1000).

### 8.2 Escrituras/sync
- Escrituras agrupadas en sync (nunca por request). Connection pooling gestionado.
- Advisory locks por source_id. Transacción única PERSIST.
- Presupuestos run + backpressure. Circuit breaker + 304 reduce trabajo.

### 8.3 Frontend
- Next.js App Router: RSC por defecto, Client Components mínimos. Code splitting automático.
- Skeletons para reducir percepción carga (UX §5). `prefers-reduced-motion` respetado.
- Countdown calculado desde `countdown_raw` (read-model) — sin recalculos costosos cliente.

## 9. Observabilidad, alertas M3–M7 + sync mudo

### 9.1 Instrumentación
- **Sentry:** errores, performance (p95 TTFB), tracing sync runs. No loguea payloads crudos/secrets.
- **PostHog:** funnel M1 (`search_submitted→detail_viewed→source_outbound_click`), eventos no-PII (`intent_key` hash/normalizado). Replay desactivado páginas con datos.
- **DB:** `sync_runs`, `fetch_log`, vistas health. Métricas M3–M7 calculables por SQL (excluyen `is_demo`).

### 9.2 SLOs/umbrales (value-impact-refinement §4)

| Métrica | Definición | Umbral/Alerta | Severidad |
|---|---|---|---|
| **M3** | Fuente verificable (publicados con source_url+no agregador+verificado) | 100% (M3a/M3b). M3c <95% 30d → Sev-2. <100% M3a → **Sev-1** | Sev-1/2 |
| **M4** | Frescura ≤14 días | ≥80% objetivo. <60% global/fuente 7d → Sev-2. <50% → **Sev-1** | Sev-1/2 |
| **M5** | UNKNOWN en accionables (UNKNOWN + source_status OPEN/UPCOMING / accionables) | ≤5% global. >15% 24h → **Sev-1**. Por fuente >30% → retira vistas abiertas | **Sev-1**/2 |
| **M6** | Duplicados (grupo>1 publicado / publicados) | ≤2%. Grupo sin resolver >14d → Sev-3. >5% → Sev-2 | Sev-2/3 |
| **M7** | Éxito sync (parse_ok AND status_extracted / runs contabilizables) | ≥90%/7d por fuente. <70% ×3 días → Sev-2. **Sync mudo (0 runs donde corresponde)** → **Sev-1**. needs_review_count/records_seen>50% → Sev-2 | **Sev-1**/2/3 |

**Detección sync mudo (crítica):** último run > 1.5× cadencia esperada → **Sev-1** (no cubierto M3–M7).

### 9.3 Anomalías automáticas (§4.8)
- Flip masivo CLOSED >20% run → **Sev-1** (congela fuente)
- Flip masivo OPEN >20% → Sev-2
- needs_review_count/records_seen >50% → Sev-2
- Sync mudo → **Sev-1**
- Countdown imposible render (test) → **Sev-1**
- source_url en denylist → cuarentena Sev-3
- Campo interno en respuesta → Sev-2

Canales/owners definidos (F3). Kill switch por fuente sin deploy.

## 10. Despliegue (Vercel + Neon/Supabase), preview, health checks, rollback

### 10.1 Topología
- **Vercel:** Frontend (App Router/RSC) + Route Handlers. Edge/CDN para catálogo público.
- **DB:** Neon/Supabase (gestionado). Connection pooling. Región más cercana a funciones Vercel.
- **Jobs:** QStash → Route Handler firmado (interno). Cron programado por fuente.
- **Obs:** Sentry + PostHog.

### 10.2 Decisión infraestructura SSRF (§11.3 architecture)
**MVP: Opción A (Vercel)** con 6 mitigaciones obligatorias:
1. Única entrada allowlist MVP (`eacea.ec.europa.eu`)
2. Ningún endpoint acepta URL (solo `endpointId`)
3. Pin IP + validación todas direcciones + redirects 0 (o revalidados)
4. Tests negativos SSRF CI (10 rangos + rebinding) verdes
5. Worker sin credenciales broad scope, DB least privilege
6. `resolved_ip` logueado en `fetch_log`

**Migración post-MVP:** Opción C (sync worker con egress restringido) sin reescribir adapters (puerto encapsulado). Decisión Q-A registrada.

### 10.3 Entornos despliegue
- **Preview (staging):** cada PR → Vercel Preview, variables staging, datos **solo demo**.
- **Production:** rama main → Vercel Production, variables prod, datos **solo reales**.
- **Feature flags:** `ENABLE_R3F` (default false MVP), `ENABLE_DEMO_SEED` (nunca true prod).

### 10.4 Health checks
- **Readiness/liveness:** `/api/health` (público ligero) o interno `/api/internal/health`. Verifica conexión DB (lectura vista ligera), último sync por fuente (M7), frescura agregada (M4).
- **Health operacional:** incluye `last_run_at`, `m7_by_source`, `m4_global`, `needs_review_count`. No expone campos internos.
- **Alerts:** sync mudo + M4/M5/M7 según umbrales.

### 10.5 Rollback
- **Vercel:** rollback instantáneo a deploy anterior.
- **DB:** PITR + migraciones backward-compatible donde posible. Cambios destructivos con feature flag + rollout gradual. Restore drill probado (DoD M-14).
- **Kill switch por fuente:** `sources.kill_switch=true` sin deploy → congela fetch, registros dejan de publicarse (sin borrar). Tiempo de corte medido (C5).

## 11. Testing (unit, integration, contract, E2E, negativo SSRF CI)

### 11.1 Unit tests (core puro)
- **`resolveStatus()` exhaustivo:** Grupo A–D data-strategy §3.7.
  - 18 `fetchOutcome` (16 fallo + 2 éxito): todos producen `UNKNOWN` en fallos, `preserveLastKnown=true`.
  - Ladder S-1–S-11 + casos borde (contradicciones OPEN+deadline pasado → `UNKNOWN`).
  - Propiedades P1–P6 (determinista, no muta evidence, nunca lanza → devuelve `UNKNOWN`).
  - Anti-assertion: `CLOSED` solo vía `sourceExplicitlySaysClosed`.
- **Deadlines:** countdown solo `publisher_stated`, nunca `UNKNOWN`/`inferred_from_cycle`, nunca en `UNKNOWN`. `precision DATE` días naturales en `deadline_tz`, `MINUTE/HOUR` instante. Nunca "0 días"/negativo (M-19).
- **Normalizers/validators:** enums allowlist, null vs centinela, sanity checks.

### 11.2 Contract tests (adapters)
- **Adapter contract:** `SourceAdapter` vs contratos §8 architecture. `planFetch`, `parse`, `normalize`, `provenanceOf`.
- **Fixture EACEA (A2):** payload RSS archivado + hash, ≥10 registros válidos, `parse_ok=true`, sin `source_url` nulo en normalizados.
- **Descriptor:** `legal_clearance` completo obligatorio. Allowlist exacta endpoints. DiscoveryHostDenylist funciona.

### 11.3 Integration tests (pipeline)
- **Pipeline completo §4.4:** FETCH→PARSE→NORMALIZE→VALIDATE→DEDUP→COMPARE→RECALC→PERSIST (1 transacción).
- **304 not_modified:** actualiza `last_seen_at`, NO `last_verified_at`.
- **Carrera runs:** advisory lock → `skipped_locked`.
- **Preserve last known:** fallo fetch → `UNKNOWN` + `preserveLastKnown=true`, `last_known_status` intacto.
- **Publish gate DB:** registro sin `source_url`+`last_verified_at` no pasa `is_published=true` (CHECK).

### 11.4 E2E tests (rutas públicas)
- **Búsqueda/listado:** filtros, paginación (limit 20/max 100), zero-results honesto (sin ensanchar filtros).
- **Detalle:** `UNKNOWN` con motivo, countdown condicional (solo publisher_stated), separación deadline-beca/admisión, CTA fuente oficial prominente.
- **Shortlist anónimo:** crear/leer, compartir solo lectura, ownership por token_hash, expira share_slug, **IDOR horizontal** (User A no accede B).
- **Metodología/fuentes/correcciones:** números excluyen `is_demo`, encolan `needs_review`.

### 11.5 Negative security tests (CI obligatorio)
- **SSRF negativo (C2):** `127.0.0.1`, `10/8`, `172.16/12`, `192.168/16`, `169.254.169.254`, `100.64/10`, `::1`, `fc00::/7`, `fe80::/10` + **DNS-rebinding**. Cada caso → `blocked_ip`/rechazo, **no fetch**. Job CI falla si pasa.
- **Allowlist serialización (C4):** JSON público no contiene campos internos (`notes_internal, legal_clearance, needs_review, needs_review_reason, discovered_via, delete_reason, resolved_ip, error_class, curator, curated_at, content_hash, version`).
- **Firma HMAC inválida/expirada:** endpoints internos rechazan (fail-closed). Sin bypass dev prod.
- **Scheme/redirects:** `file:`, `data:`, `javascript:`, redirect cross-host → `redirect_violation`/rechazo.
- **Size/content-type:** too_large, content_type_rejected → `UNKNOWN` + preserveLastKnown.
- **XSS:** contenido T0 render texto, sin `dangerouslySetInnerHTML`. CSP headers presentes.

## 12. Riesgos AR-1..AR-14 consolidados (con mitigaciones)

> **Nota de trazabilidad:** la fuente canónica (`architecture §13`) define **14 riesgos (AR-1..AR-14)**, no 9. Todos se consolidan aquí. No se descarta ninguno: AR-10..AR-14 son riesgos de plataforma/seguridad/operación cuya mitigación ya aparece diseñada en §5–§11 y aquí se enlaza a su sección.

| # | Riesgo | Tipo | Mitigación | Señal temprana |
|---|---|---|---|---|
| **AR-1** | EACEA RSS delta acotado (~25 ítems, mezcla Legacy) — no cubre corpus solo | Arquitectónico/Datos | Feed trigger, no fuente verdad. Curación manual canal principal. Cola P0–P3 + `last_seen_at` envejece. `cycle_label` distingue Legacy/actual. | `last_seen_at` envejece en OPEN, M7 estable pero registros no renuevan |
| **AR-2** | Sin control egress Vercel (§11.3) | Plataforma/SSRF | Opción A + 6 mitigaciones. Frontera puerto encapsulada (migrable a C). Tests negativos CI obligatorios. | SSRF negativo falla CI |
| **AR-3** | FTS multilingüe ES/EN | Rendimiento/Búsqueda | `tsvector` spanish+simple ponderado, `unaccent`, fallback simple. Dataset queries ES/EN. | M2 > 10% top-20 |
| **AR-4** | Countdown timezone/precisión (R6) | UX/Datos | `deadline_at` tz + `deadline_basis`+`deadline_precision`+`deadline_tz`+`deadline_raw_text`. Solo `publisher_stated`, nunca UNKNOWN/inferred en countdown. `countdown_raw` NULL si condiciones fallan. Nunca 0/negativo. | Reportes "0 días"/negativo (test M-19 falla) |
| **AR-5** | Sync degrada silencioso (R2) | Operación | `sync_runs` + M7 <70%×3d + sync mudo Sev-1 + `UNKNOWN` al fallar + envejecimiento visible UI. | M7 por fuente, sync mudo |
| **AR-6** | Carreras runs (QStash retry+cron) | Integridad | `pg_try_advisory_xact_lock` por `source_id` → `skipped_locked`. | `outcome=skipped_locked` en runs |
| **AR-7** | Data poisoning (R1) | Seguridad/Integridad | Estado solo campos allowlisted, sanity, provenance por campo, `needs_review`, audit/status_history append-only, sin borrado silencioso, dedupe conservador (nunca fusiona). Flip masivo >20% → **Sev-1** + congela fuente. | Flip masivo CLOSED/OPEN, A1/A2 |
| **AR-8** | Coste/vendors (5 vendors MVP) | Coste/Complejidad | Consolidar Postgres, Redis eliminado, PostHog opcional cae a first-party. Sentry+PostHog alto valor. | Coste vs métrica servida |
| **AR-9** | Cold start corpus <300 (R5) | Producto/Calendario | `is_demo` separado, cobertura declarada real (no slogan), profundidad pocos países. **Q1 abierta** (ritmo curación). Gate §3.2 no se baja (K12). | Ritmo curación vs gate M-01..M-09 |
| **AR-10** | Fuga de campos internos por caché compartida (mismo read-model sirve rutas públicas y user-scoped) | Seguridad/Privacidad | Claves de caché **sin dimensión de usuario** para catálogo público; `private, no-store` en user-scoped; serialización allowlist + test CI (§5.2, §11.5). | Test de allowlist (§11.5) falla |
| **AR-11** | Latencia función ↔ Postgres (Vercel region vs DB region) | Rendimiento/Coste | DB en la **misma región** que las funciones; pooling gestionado; escrituras agrupadas en el sync, **nunca por request** (§8.2). | p95 de TTFB |
| **AR-12** | Regla de importación de `core/` erosionada (el layering solo funciona si es verificable) | Mantenibilidad/Integridad | Lint de arquitectura que **falla el build** si `core/` importa `adapters/`, `db/`, `fetch`, `next/*` (§3.1). `resolveStatus` deja de ser puro → se pierde D4. | CI |
| **AR-13** | Sin auth para el panel interno de curación y el endpoint de job | Seguridad | Secreto firmado HMAC con expiración, comparación en tiempo constante, **fail closed sin bypass de dev en prod**, least privilege (token sync ≠ token admin) (§5.4). | Test de firma inválida |
| **AR-14** | El corpus curado a mano **no es reproducible** por pipeline | Operación/Continuidad | **Restore drill agendado y con fecha**, no solo backup configurado; export versionado del corpus; `curator` + `curated_at` permiten reconstruir la decisión (§6.5). RTO/RPO por fijar (P4). | Restore drill sin acta |

**Riesgos aceptados documentados:** Opción A sin control de egress (AR-2), con las 6 mitigaciones obligatorias de §10.2, hasta migración a Opción C. Cold start (AR-9). No se relajan umbrales de honestidad para alcanzar el gate.

**Deuda de diseño explícita que Fase 7 debe verificar antes de implementar:**
| # | Punto abierto | Por qué no se puede decidir en diseño | Ref |
|---|---|---|---|
| 1 | `unaccent` con wrapper `IMMUTABLE` en columna STORED | Postgres no permite marcar `unaccent` como inmutable sin wrapper; comportamiento depende del proveedor | data-strategy §2.9 / AR-3 |
| 2 | FTS ES+EN en bloqueo (E6, P1) | Tensión entre corpus mayoritariamente EN y configuración `spanish`; decisión de producto | refinement E6 / P1 |
| 3 | RTO/RPO y cadencia de re-verificación (P4) | Requieren restore drill y cálculo de carga reales | AR-14 / P4 |
| 4 | Proveedor de Postgres (Neon vs Supabase) | Depende de región, coste y verificación de PITR del proveedor | Q-B |
| 5 | Región de PostHog (EU cloud vs self-host) | Depende de política de datos y legislación aplicable | Q-D |

## 13. Entregable

**Ruta de entrega:** `docs/technical/technical-blueprint.md` (este documento).  
**Formato:** Markdown estructurado, sin código de implementación (solo diseño, contratos, SQL/pseudo-SQL de diseño, diagramas Mermaid ya existentes referenciados).  
**Cumplimiento:** Todos los puntos 1–12 solicitados cubiertos, con trazabilidad a fuentes, decisiones justificadas, alternativas descartadas y riesgos consolidados.

**Decisiones ya cerradas por el brief (no reabrir en Fase 7):** Q-A → Opción A (Vercel) adoptada con frontera de fetch encapsulada para migración futura a Opción C. Q5 → sin embeddings en MVP.

> **Nota de trazabilidad.** Las decisiones aprobadas por el propietario están registradas como `D11`–`D14` en `discovery.md` §10: **D11** Opción A, **D12** publicar ~150–250 registros (300 aspiracional), **D13** UI ES + EN, **D14** curación manual 2–4 h/semana (~3 meses). `discovery.md` §10.1 explica por qué `D#` (aprobadas) y `Q-#` (abiertas) son espacios de nombres distintos. En particular, **Q-C** ("¿1 adapter + N curados o esperar 3 automatizados?") queda cerrada por coherencia con **D2/D3**, no por D12.

**Siguiente paso:** cerrar **Q-B** (Neon vs Supabase) y **Q-D** (PostHog región) antes de provisionar producción, y verificar los 5 puntos de deuda de diseño de §12 al iniciar la implementación.
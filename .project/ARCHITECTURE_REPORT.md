# ARCHITECTURE REPORT — Fase 2 (ligera) · 2026-09-29
Agente: architect · Estado: **pendiente de aprobación del usuario** (D1 abierta)

## Hallazgos
1. Dataset pequeño (cientos a pocos miles), escritura solo humana, lectura pública anónima → sin servidor/API propios.
2. El activo valioso son los datos curados: importa propiedad, backup y trazabilidad más que rendimiento.
3. Estado derivado al leer (vista SQL con `now()`) → no hace falta cron.
4. **Trampa:** una vista Postgres ignora RLS por defecto → crear con `security_invoker = true` o filtrar `publicada`.
5. Lovable = SPA (Vite, render en cliente): SEO por página limitado.
6. Puntos únicos de fallo (Supabase una región, hosting Lovable) aceptados con backup + plan de recuperación.

## Decisiones propuestas
- **D1 Backend/datos:** Supabase propio conectado a Lovable (propiedad, SQL, migraciones en repo, MCP, `pg_dump`, Table Editor como panel de curación). Alternativas: Lovable Cloud (menos fricción; desde jul-2026 tiene exportación oficial a Supabase propio — verificado en fuentes secundarias), JSON en repo (rechazado por el usuario).
  - Verificado: plan gratuito de Supabase pausa proyectos tras 1 semana de inactividad, máx. 2 proyectos activos, 500 MB BD; Pro desde USD 25/mes sin pausas.
- **D2 Módulos:** monolito SPA.
  - `data/` (dueño `database`): tablas, RLS, `supabase/migrations/`, vistas `becas_publicas` (security_invoker, estado derivado) y `paises_con_becas`.
  - Estado solo en SQL: `cerrada` si `deadline_at < now()`, `cierra_pronto` si < N días (N en `config`, se fija en UX), si no `abierta`. El cliente no recalcula.
  - Zona horaria: `deadline_at` timestamptz + `deadline_tz` (IANA) + `deadline_solo_fecha`; solo fecha → fin del día en la zona oficial; zona desconocida → interpretación conservadora + revisión. UI muestra fecha + zona fuente + "quedan X días".
  - `globe/`: lazy, recibe `paises_con_becas`, emite `onSelectCountry(iso2)`; no conoce el modelo de becas.
  - `search/`: ruta accesible principal; carga una vez (TanStack Query), filtra en cliente, filtros en la URL; destino del fallback.
  - `analytics/`: envoltura tipada sobre PostHog, sin PII.
  - `admin/`: sin panel en MVP; Table Editor de Supabase con MFA y flujo `borrador → en_revision → publicada` (revisión por dos personas como proceso).
- **D3 Modelo conceptual:** `pais` (iso2) · `institucion` · `beca` (url_oficial y verificado_el obligatorios; tipo_cobertura total/parcial/no_especificada; monto solo oficial con moneda; estado_revision) · N:M `beca_pais_destino`, `beca_nacionalidad_elegible` (+ `abierta_a_todas`), `beca_nivel`, `beca_area` (catálogo controlado) · `convocatoria` (apertura, deadline, tz, tipo fija/rolling/por_confirmar, url_fuente, verificado_el). Nunca se generan fechas futuras automáticamente. Badge "verificación antigua" por umbral.
- **D4 Globo:** react-globe.gl (three.js): polígonos por país, hover/clic, compatible con Vite/Lovable. Móvil: pixel ratio limitado, world-110m, sin atmósfera costosa, pausar fuera de vista. Carga diferida tras detectar WebGL; la lista se pinta primero. Descartados: cobe (no ilumina países), three.js a mano, mapa 2D (post-MVP si el fallback se usa mucho). Fallback = lista + selector de país.
- **D5 Seguridad:** RLS en todas las tablas; anon solo SELECT de `publicada`; sin escrituras desde cliente; `service_role` nunca al cliente; sin PII; `url_oficial` https + `rel="noopener noreferrer"`; `anonymize_ips` de PostHog a decidir en Fase 11.
- **D6 Observabilidad:** excepciones autocapturadas + fallos de Supabase y WebGL; eventos alineados con VALUE_REPORT (unificar nombres en Blueprint). Sin replay.
- **D7 Rendimiento:** una consulta de lista + agregado por país; detalle bajo demanda; TanStack Query; revisar si > pocos miles de filas.
- **D8 SEO:** MVP con rutas `/beca/:slug`, `/pais/:iso2` y meta por ruta; SSR/prerender + sitemap post-MVP si la adquisición orgánica importa.
- **D9 Backup/DR:** `pg_dump` semanal (GitHub Action, artifact privado) + migraciones en repo; restaurar en proyecto nuevo, RTO de horas. Sin replicación/failover.
- **D10 No hacer:** servidor/API propios, microservicios, colas, cron de estados, edge functions, scraping, IA (ni para resumir requisitos), búsqueda externa, estado global pesado, SSR/Next.js, panel admin propio, staging, montos estimados.

## Riesgos
R1 vista sin security_invoker filtra borradores · R2 pausa/límites del plan gratuito · **R3 deadlines mal interpretados por zona horaria (riesgo principal de veracidad)** · R4 Table Editor sin historial ni doble revisión · R5 peso de three.js y calidad del globo generado · R6 SEO limitado por SPA · R7 lock-in si Lovable Cloud (mitigado por exportación oficial).

## Pendiente para Fase 3 (UX)
N días de "cierra pronto", umbral de "verificación antigua", presentación de becas `rolling`, unificar nombres de eventos con VALUE_REPORT.

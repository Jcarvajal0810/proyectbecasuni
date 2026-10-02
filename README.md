# Plataforma de becas verificables

Directorio search-first de becas internacionales donde **cada dato tiene una
fuente y una fecha de verificación**. Si no se puede comprobar, el estado es
`UNKNOWN` — nunca "cerrada".

## Reglas que el código impone

Estas no son convenciones: cada una está cubierta por tests que fallan si se
rompen.

| Regla | Dónde vive | Test |
| --- | --- | --- |
| Un fallo de fetch **nunca** produce `OPEN`, `CLOSED` ni `EXPIRED` | `src/core/status/resolve-status.ts` | `tests/resolve-status.test.ts` |
| El countdown **nunca** es `0` sobre un deadline vivo | `src/core/deadline/countdown.ts` | `tests/countdown.test.ts` |
| `core/` no importa `adapters/`, `db/`, `fetch/` ni `next/*` | Estructura del proyecto | `tests/architecture-boundaries.test.ts` |
| Solo se allowlistan destinos exactos y IPs públicas | `src/fetch/allowlist.ts` | `tests/ssrf.test.ts`, `tests/allowlist-edge.test.ts` |
| La IP validada es la IP a la que se conecta | `src/fetch/safe-http-client.ts` | `tests/safe-http-client.test.ts` |
| `unsafe-eval` no aparece en producción | `src/proxy.ts` | `tests/csp.test.ts` |
| Una firma de job no se puede reenviar dentro de su ventana | `src/jobs/replay-guard.ts` | `tests/replay-guard.test.ts` |
| El token de shortlist solo se guarda hasheado | `src/shortlist/shortlist.ts` | `tests/shortlist.test.ts` |

## Puesta en marcha

```bash
npm install
cp .env.example .env.local     # rellena DATABASE_URL y JOB_HMAC_SECRET
npm run db:migrate
npm run dev
```

Sin `DATABASE_URL`, la app arranca y devuelve listas vacías en vez de romperse:
es preferible una home vacía a un error 500.

## Verificación

```bash
npm run verify      # typecheck + lint + test
npm run test:coverage
```

La cobertura se mide solo sobre `src/core/`, `src/fetch/` y `src/jobs/auth.ts`,
con umbral de fallo en el 90%. No es decoración: son las fronteras donde un
refactor accidental rompe la promesa del producto.

## Estructura

```
src/core/       ← funciones puras. Sin I/O, sin reloj, sin DB.
src/fetch/      ← única puerta de salida de red (allowlist + pinning DNS).
src/adapters/   ← un archivo por fuente. No hacen fetch: solo parsean.
src/db/         ← Postgres y el read model allowlisted.
src/jobs/       ← sync y auth HMAC.
src/app/        ← UI ES/EN y Route Handlers.
db/migrations/  ← applied en orden, registradas en schema_migrations.
```

El layering es verificado por `tests/architecture-boundaries.test.ts`. Si
`resolveStatus()` necesita una consulta a la base para funcionar, el diseño
está mal: se pasa el contexto como argumento.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:check` | Prueba la conexión e informa extensiones (sin imprimir la URL) |
| `npm run db:migrate` | Aplica `db/migrations/*.sql` de forma idempotente |
| `npm run db:seed` | Inserta el fixture `is_demo` (invisible en el sitio) |
| `npm run sql -- "SELECT 1"` | Ejecuta un SQL suelto contra la DB |
| `npm run sync` | Dispara el sync firmado, como haría QStash |
| `npm run test` | Suite de Vitest |
| `npm run test:coverage` | Suite + cobertura con umbrales |
| `npm run verify` | typecheck + lint + test |

### Tests contra la base de datos

`tests/db.integration.test.ts` se salta solo si no hay `DATABASE_URL`; con
`.env.local` presente corre de verdad contra Postgres y verifica `f_unaccent`,
la búsqueda con y sin tilde y el filtrado de la vista pública.

## Monitoreo

Hay que vigilar **dos fallos distintos**, porque confundirlos es el error clásico:

| Qué falla | Dónde se ve | Quién avisa |
| --- | --- | --- |
| El proceso de sync se detuvo | `/api/health` → 503 | UptimeRobot (gratis) sobre `/api/health` |
| Una fuente concreta falla | Alert push | `ALERT_WEBHOOK_URL` desde el cron |

El sync no puede avisar de sí mismo cuando está muerto: si el cron no corre, no
hay nadie para enviar nada. Esa detección la hace un monitor externo. Y al revés:
un monitor externo ve verde mientras una fuente concreta lleva días fallando, que
es justo lo que el cron sí detecta.

```
uptime → GET /api/health          (UptimeRobot, cada 5 min)
cron   → GET /api/jobs/cron       (Vercel, 06:00 UTC, diario)
```

El cron usa `CRON_SECRET`, no el HMAC de `/api/jobs/sync`: Vercel no puede
firmar, solo enviar `Authorization: Bearer …`.

Para configurar el push, ver la sección de alertas de `.env.example`. Sin
`ALERT_WEBHOOK_URL` el cron funciona igual, solo que en silencio.

## Estado

El corpus público aún no está cargado. La fuente automatizada es el RSS de
EACEA; el resto del objetivo (150–250 registros) requiere verificación manual
contra fuentes oficiales. `npm run db:seed` carga el fixture de desarrollo, que
está marcado `is_demo` y **no** aparece en el sitio.
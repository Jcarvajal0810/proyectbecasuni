# PROJECT BLUEPRINT — Fase 5 · 2026-09-29
Agente: architect · Base: VALUE_REPORT, ARCHITECTURE_REPORT (D1-D10), DESIGN_STRATEGY (1-11), VISUAL_DIRECTION, decisions.md, migraciones aplicadas · Estado: **pendiente de aprobación**

## 0. Arquitectura en una línea
SPA React (Lovable) que solo lee 3 fuentes de Supabase con la publishable key y hace todo el filtrado en cliente con una sola función pura; el globo va en un chunk lazy que es opcional. No hay servidor propio, ni caché persistente, ni auth.

**Alternativas descartadas**
- Filtrar en el servidor (RPC o PostgREST por filtro): más peticiones y latencia, y los conteos por faceta serían caros. El catálogo es pequeño.
- `paises_con_becas` como fuente del globo: no refleja los filtros (R9). Queda como oráculo de test.
- Integración nativa de Supabase en Lovable: da privilegios de esquema a un escritor de UI.
- Estado global (Redux o Zustand): la URL más TanStack Query bastan.
- zod en runtime: una dependencia más sin necesidad, porque el contrato está fijado por las vistas y los tests.

## 1. MVP (dentro / fuera)
1. **Dentro:**
 - Home con contador honesto, buscador, filtros (nivel, área, cobertura, idioma, estado, "Soy de", "Ver cerradas") y tablero agrupado por plazo.
 - Página de país y ficha de beca con CTA a la URL oficial y nota de fuente.
2. **Dentro:** globo lazy (atlas plano, refleja los filtros) con fallback por motivo, índice de países accesible y "Cómo verificamos".
3. **Dentro:** estados de carga, vacío con sugerencias, error, parcial, no encontrada y temporada baja. También "Reportar error" (Google Forms), compartir (WhatsApp o copiar), 17 eventos PostHog y meta por ruta.
4. **Dentro:** backup semanal con `pg_dump` y migraciones en el repo.
5. **Fuera:** cuentas, favoritos, alertas y correo.
6. **Fuera:** IA, scraping, comparador, montos convertidos, comunidad, solicitudes y monetización.
7. **Fuera:** SSR, prerender, sitemap y vista previa de WhatsApp por beca (post-MVP, riesgo R2).
8. **Fuera:** panel de administración propio (se cura en el Table Editor), modo oscuro, multi-idioma y mapa 2D.
9. **Fuera:** session replay, autocapture y cualquier otro servicio de terceros.
10. **Fuera:** becas inventadas en producción, en cualquier forma.

## 2. Rutas y layout persistente
Router: `createBrowserRouter` (react-router-dom v6) con `<ScrollRestoration/>`.

```
AppLayout (encabezado 56/64 px, "Saltar a los resultados", <Outlet/>, pie)
├─ ExploreLayout  (en desk: grid 2 columnas, globo sticky a la izquierda; el globo PERSISTE entre / y /pais)
│   ├─ /                 HomePage
│   └─ /pais/:iso2       PaisPage
├─ /beca/:slug           BecaPage          (sin globo; el globo se desmonta; al volver se reserva la caja → CLS 0)
├─ /como-verificamos     ComoVerificamosPage
└─ *                     NotFoundPage
```

| Ruta | Lee (hooks de `src/data`) | Estados | Meta (`useDocumentMeta`) |
|---|---|---|---|
| `/` | `useBecas`, `usePaises`, `useAreas`, `useConfig`; en desk además `useGeoPaises` (lazy) | cargando (5 filas esqueleto, `aria-busy`) · ok · vacío con filtros (sugerencias) · temporada baja (0 abiertas sin filtros → próximas aperturas + por confirmar) · error (`role=alert` + Reintentar) · globo: cargando / fallback por motivo | "Becas internacionales abiertas hoy, verificadas \| {NOMBRE_APP}" |
| `/pais/:iso2` | lo mismo que `/`. El país sale del path | iso2 no válido o no está en `pais` → vista 404 · 0 abiertas → "Hoy no hay becas abiertas con destino en X" + próximas aperturas + "Por confirmar" desplegado · 0 con filtros → "0 becas con estos filtros en X · Quitar filtros" (el país NO se deselecciona) | "Becas para estudiar en {país} abiertas hoy \| …" |
| `/beca/:slug` | `useBeca(slug)` (beca_detalle), `usePaises`, `useBecas` solo para "similares" si está cerrada | cargando · ok · parcial (campos vacíos → "Consultar convocatoria") · cerrada (CTA secundario + similares) · no encontrada (`maybeSingle` → null: h1 "No encontramos esta beca" + buscador + `noindex`) · error | "{titulo} · {institucion_nombre} \| …" |
| `/como-verificamos` | `useConfig` (muestra los umbrales reales 30/120) | estática; si falla config, usa textos sin cifras | "Cómo verificamos \| …" |
| `*` | — | 404 con buscador y enlace a inicio, `noindex` | "Página no encontrada" |

**Normalización del path.** `/pais/DE` redirige con replace a `/pais/de`. Las formas canónicas son iso2 en minúscula en el path y en mayúscula en los datos.

**Globo a pantalla completa en móvil.** No es una ruta. Se abre con `navigate(location, { state: { globo: true } })`, es decir, un push al historial, para que el botón Atrás de Android lo cierre.

**"Mostrar 20 más".** El número de filas visibles se guarda en `location.state.visibles` (con replace), de modo que al volver de la ficha se restauran junto con el scroll.

**"← Volver a los resultados".** Si `location.state.desde` existe, hace `navigate(-1)`. Si no, el enlace es "← Todas las becas" y lleva a `/`.

## 3. Estructura de `src/` y fronteras
```
src/
main.tsx            imports de @fontsource, QueryClientProvider, RouterProvider, initAnalytics() diferido
router.tsx          definición de rutas (§2)
index.css           tokens CSS de VISUAL_DIRECTION §3 literales + .num + regla global de reduced-motion
layouts/            AppLayout.tsx, ExploreLayout.tsx
routes/             HomePage, PaisPage, BecaPage, ComoVerificamosPage, NotFoundPage
data/               supabaseClient.ts · types.ts · columnas.ts · queries.ts (fetchers) · keys.ts · hooks.ts · queryClient.ts
lib/                filtrarBecas.ts (+ .test.ts) · normalizar.ts · url.ts (+ test) · fechas.ts (+ test) · formato.ts (monto, dominio)
                    · tokens.ts · config.ts (NOMBRE_APP, REPORT_FORM_*) · useDocumentMeta.ts · useReducedMotion.ts · useDesk.ts
search/             SearchBox, SoySelect, FiltrosBarDesk (Popovers), FiltrosSheet (móvil), Tablero, FilaBeca, GrupoPlegable,
                    ResumenLive, EmptyState (sugerencias), IndicePaises, Contador
globe/              GlobeSlot.tsx (capacidades, motivo, lazy, ErrorBoundary, reserva de caja) · GlobeCanvas.tsx (ÚNICO import de
                    react-globe.gl/three; default export para lazy) · materiales.ts · geo.ts (fetch + mapeo ISO) · capacidad.ts
                    · Leyenda.tsx · ZoomControles.tsx · HojaPais.tsx (solo props) · GlobeFullscreen.tsx
analytics/          posthog.ts (init diferido + cola) · track.ts (eventos tipados) · usePageviews.ts · sanitizar.ts
ui/                 componentes propios del sistema: EstadoBadge, NotaFuente, CtaOficial, Filete, ErrorBlock, SkeletonFila, BotonSecundario
components/ui/      shadcn (convención de Lovable; solo Sheet, Popover, Command, Collapsible, Checkbox, Select, Button, Badge si se usa)
dev/fixtures/       becas ficticias SOLO para desarrollo (§10)
public/geo/paises-110m.json   (dueño: frontend; ver §7)
```

**Fronteras (quién puede importar qué):**
- `routes/` y `search/` → `data/hooks`, `lib/`, `ui/`, `analytics/track`, `globe/GlobeSlot`.
- `globe/` **no importa `data/` ni conoce `BecaPublica`**. Recibe `counts: Map<string, number>`, `nombres: Map<string, string>`, `seleccionado?: string`, `modo: 'desk' | 'fullscreen'`, `reducedMotion` y `onSelect(iso2)`. Solo `GlobeCanvas.tsx` importa `react-globe.gl` y `three`.
- `data/`: solo aquí se importa el cliente de Supabase.
- `lib/filtrarBecas.ts`: pura, sin React ni IO. Todo filtrado, orden y conteo pasa por aquí.
- `analytics/`: solo aquí se importa `posthog-js`.

**`src/lib/tokens.ts`** (espejo de `--globe-*` y de los estados; es el único sitio del código con HEX aparte de `index.css`):
```ts
export const GLOBE = {
bg: '#F6F3EC', ocean: '#E9E3D6', land: '#CFC8B8', landHover: '#B8B09E',
lit: '#0B6E4F', litHover: '#085A40', stroke: '#F6F3EC', strokeActive: '#1C1B18',
altitudBase: 0.006, altitudHover: 0.018, altitudSeleccion: 0.024,
pov: { lat: 20, lng: -35, altitude: 2.2 }, povMovil: 2.6, povPais: 1.8,
zoom: { min: 1.4, max: 3.2, paso: 0.4 }, camaraMs: 900, transicionMs: 200, pixelRatio: { desk: 2, movil: 1.5 },
} as const;
export const DESK_QUERY = '(min-width: 1024px) and (pointer: fine)';
export const PAGINA = 20;
export const DEBOUNCE_TEXTO_MS = 250;
```

## 4. Contrato de datos del cliente
**Fuentes permitidas:** `becas_publicas`, `beca_detalle`, `pais`, `area` y `config`. Nada más. `paises_con_becas` solo se usa en el test oráculo, nunca en la app. `select('*')` y las tablas `beca`, `convocatoria`, `institucion` y N:M están prohibidos (anon los tiene denegados por los grants por columna).

**Cliente**
```ts
// src/data/supabaseClient.ts — valores públicos (publishable key); nunca service_role/secret
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
// SUPABASE_URL = 'https://zmseqixhtciqylprfrfh.supabase.co'; la key la inyecta la sesión principal (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY con fallback a constante pública)
```

**Tipos** (derivados de las columnas finales de `becas_publicas` y `beca_detalle`)
```ts
export type Estado = 'abierta' | 'cierra_pronto' | 'cerrada' | 'por_confirmar';
export type TipoDeadline = 'fija' | 'rolling' | 'por_confirmar';
export type Nivel = 'pregrado' | 'maestria' | 'doctorado' | 'posdoc' | 'curso_corto' | 'intercambio' | 'investigacion';
export type TipoCobertura = 'total' | 'parcial' | 'no_especificada';
export type PeriodoMonto = 'mensual' | 'anual' | 'total' | 'unico';

export interface BecaPublica {
id: string; slug: string; titulo: string;
institucion_nombre: string; institucion_pais_iso2: string | null;
paises_destino: string[];            // ISO2 mayúsc., puede ser []
niveles: Nivel[]; areas: string[];   // area.slug; 'todas-las-areas' = comodín
tipo_cobertura: TipoCobertura;
monto: number | null; moneda: string | null; monto_periodo: PeriodoMonto | null; // los tres juntos o ninguno
nacionalidad_abierta_a_todas: boolean; nacionalidades_elegibles: string[];       // [] y !abierta = sin dato
idiomas_requeridos: string[]; certificacion_idioma: string | null;               // ISO 639-1; [] = sin dato
deadline_at: string | null; deadline_tz: string | null;                          // ISO timestamptz; IANA
deadline_solo_fecha: boolean | null; tipo_deadline: TipoDeadline | null;         // null = sin convocatoria vigente
estado: Estado; dias_restantes: number | null;                                   // de la vista; NO recalcular
verificado_el: string; verificacion_antigua: boolean;                            // 'YYYY-MM-DD'
url_oficial: string; url_fuente: string | null;
proxima_convocatoria_apertura: string | null; publicada_el: string | null;
}
export interface BecaDetalle extends BecaPublica {
idioma_requisito: string | null;      // nota legada, solo en la ficha
descripcion_corta: string | null; cobertura_detalle: string | null; requisitos_clave: string | null;
}
export interface Pais { iso2: string; iso3: string | null; nombre_es: string }
export interface Area { slug: string; nombre_es: string }
export interface Umbrales { diasCierraPronto: number; diasVerificacionAntigua: number }
```
Se omiten deliberadamente `institucion_id` e `idioma_requisito` en la lista. `numeric` llega como número JSON.

**Consultas exactas**
```ts
export const COLS_LISTA =
'id,slug,titulo,institucion_nombre,institucion_pais_iso2,paises_destino,niveles,areas,tipo_cobertura,' +
'monto,moneda,monto_periodo,nacionalidad_abierta_a_todas,nacionalidades_elegibles,idiomas_requeridos,' +
'certificacion_idioma,deadline_at,deadline_tz,deadline_solo_fecha,tipo_deadline,estado,dias_restantes,' +
'verificado_el,verificacion_antigua,url_oficial,url_fuente,proxima_convocatoria_apertura,publicada_el';
export const COLS_DETALLE = COLS_LISTA + ',idioma_requisito,descripcion_corta,cobertura_detalle,requisitos_clave';

fetchBecas   = () => supabase.from('becas_publicas').select(COLS_LISTA).order('deadline_at', { ascending: true, nullsFirst: false }).returns<BecaPublica[]>();
fetchBeca    = (slug) => supabase.from('beca_detalle').select(COLS_DETALLE).eq('slug', slug).maybeSingle<BecaDetalle>(); // null → no encontrada
fetchPaises  = () => supabase.from('pais').select('iso2,iso3,nombre_es').returns<Pais[]>();
fetchAreas   = () => supabase.from('area').select('slug,nombre_es').order('nombre_es').returns<Area[]>();
fetchConfig  = () => supabase.from('config').select('clave,valor');   // → Umbrales con fallback 30/120 si falta o no es entero
```
Todo fetcher hace `if (error) throw error`. Un slug que no cumple `^[a-z0-9]+(-[a-z0-9]+)*$` va directo a "no encontrada" sin petición.

**TanStack Query** (`src/data/queryClient.ts`)

| Clave | Fuente | staleTime | gcTime | refetchOnWindowFocus |
|---|---|---|---|---|
| `['becas','lista']` | becas_publicas | 5 min | 30 min | sí (el estado depende de `now()`) |
| `['becas','detalle',slug]` | beca_detalle | 5 min | 10 min | sí |
| `['catalogo','paises']` | pais | Infinity | Infinity | no |
| `['catalogo','areas']` | area | Infinity | Infinity | no |
| `['config']` | config | 60 min | Infinity | no |
| `['geo','paises-110m']` | `/geo/paises-110m.json` | Infinity | Infinity | no |

- **Reintentos:** `retry: (n, err) => n < 2 && esTransitorio(err)`, es decir, 2 reintentos solo para errores de red, 5xx o 408/429. Nunca para 4xx de PostgREST o permisos (42501, PGRST*). `retryDelay` exponencial por defecto.
- **Error final:** el `onError` global de `QueryCache` dispara `data_load_failed {resource, error_kind, retry_count}` y `captureException` sin PII.
- **Sin caché persistente:** ni `persistQueryClient`, ni localStorage, sessionStorage o IndexedDB. Un error no muestra datos viejos: bloque de error + Reintentar (`refetch`).
- **Degradación:**
- Si fallan `becas` o `paises`, error de página.
- Si falla `areas`, se oculta el filtro Área.
- Si falla `config`, la sección se titula "Cierran pronto", sin cifra.
- **Plazo vencido con caché vieja:** `plazoVencido(b, ahora)` (fija, `deadline_at < ahora` y estado abierta o cierra_pronto) muestra "Plazo vencido · actualizando" e invalida `['becas','lista']` una vez; la deduplicación de Query evita repetirlo.

## 5. `filtrarBecas` (pura; la comparten lista, país, globo y conteos)
```ts
export interface Filtros {
q: string;                   // ya con debounce
pais: string | null;         // ISO2 del path
soy: string | null;          // ISO2 nacionalidad
nivel: Nivel[]; area: string[]; cobertura: TipoCobertura[]; idioma: string[];
estado: Array<'cierra-pronto' | 'con-fecha' | 'continua'>;   // [] = todos; solo afecta grupos principales
cerradas: boolean;
}
export interface Ctx { nombresPais: Map<string, string>; ahora: Date }
export interface Resultado {
grupos: { cierranPronto: BecaPublica[]; conFecha: BecaPublica[]; continua: BecaPublica[];
          porConfirmar: BecaPublica[]; cerradas: BecaPublica[] /* [] si !cerradas */ };
conteos: { principales: number; cierranPronto: number; conFecha: number; continua: number;
           porConfirmar: number; cerradas: number /* siempre contado */ };
proximasAperturas: BecaPublica[];   // cerrada|por_confirmar con proxima_convocatoria_apertura, asc
}
export function coincide(b, f, ctx): boolean;
export function filtrarBecas(becas, f, ctx): Resultado;
export function agregarPorPais(becas, f, ctx): Map<string, number>;
export function sugerenciasVacio(becas, f, ctx): Array<{ dimension: keyof Filtros; valor?: string; n: number }>;
export function conteosFaceta(becas, f, ctx, dim: 'nivel'|'area'|'cobertura'|'idioma'|'estado'): Map<string, number>;
export function resumenCatalogo(becas): { abiertas: number; paises: number; ultimaVerificacion: string | null };
export function esSinDatoNacionalidad(b): boolean;   // !abierta_a_todas && elegibles.length === 0
```

**Semántica de `coincide`** (AND entre dimensiones; dentro de cada dimensión, OR entre valores):
- **pais:** `paises_destino.includes(pais)`.
- **soy (nacionalidad):** entra si `nacionalidad_abierta_a_todas`, **o** si `nacionalidades_elegibles.includes(soy)`, **o** si no hay dato (`esSinDatoNacionalidad`, que la UI marca como "Consultar convocatoria"). Se excluye solo cuando hay una lista no vacía que no contiene `soy`. Si hay lista y además `abierta_a_todas`, gana `abierta_a_todas`.
- **nivel:** intersección no vacía con `niveles`.
- **area:** intersección no vacía con `areas`, **o** `areas` incluye `'todas-las-areas'`.
- **cobertura:** `tipo_cobertura ∈ cobertura`.
- **idioma** (semántica recomendada, pendiente de confirmar en §13): entra si `idiomas_requeridos` está vacío ("Consultar convocatoria") o tiene intersección no vacía con `idioma` ("la beca acepta alguno de tus idiomas"). El filtro se muestra solo si al menos una beca tiene `idiomas_requeridos` no vacío.
- **q:** `normalizar(s) = s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim()`.
- Se separa en tokens por espacios y se descartan los de 1 carácter.
- Cada token debe aparecer en el texto indexado: `titulo + institucion_nombre + nombres_es de paises_destino + iso2`.
- El texto indexado se calcula una vez por beca (WeakMap).
- **estado** (solo grupos principales): `cierra-pronto` → estado `cierra_pronto`; `con-fecha` → fija y `abierta`; `continua` → rolling y `abierta`.

**Agrupación y orden** (`tipo_deadline` más `estado` de la vista; el cliente no recalcula estados):

| Grupo | Regla | Orden |
|---|---|---|
| cierranPronto | `estado='cierra_pronto'` | `deadline_at` asc, luego `titulo` (localeCompare 'es') |
| conFecha | `tipo_deadline='fija'` y `estado='abierta'` | `deadline_at` asc, `titulo` |
| continua | `tipo_deadline='rolling'` y `estado='abierta'` | `verificado_el` desc, `titulo` |
| porConfirmar | `estado='por_confirmar'` (sin convocatoria, tipo `por_confirmar` o rolling con verificación antigua) | `proxima_convocatoria_apertura` asc con nulos al final, `titulo` |
| cerradas | `estado='cerrada'` | `deadline_at` desc |

- **Estado desconocido** (defensivo): se trata como `porConfirmar`.
- **Título del tramo:** "Cierran en los próximos {config.diasCierraPronto} días". La pertenencia la decide `estado` de la vista, que usa el mismo umbral.
- **Paginación:** "Mostrar 20 más" pagina la concatenación `cierranPronto` → `conFecha` → `continua`. Lo hace la UI, no la función.

**Agregado del globo:** `agregarPorPais(becas, f, ctx)` aplica `coincide` con `{...f, pais: null, cerradas: false}`. Cuenta solo `estado ∈ {abierta, cierra_pronto}` (las rolling abiertas tienen `estado='abierta'` y cuentan) y suma 1 por cada iso2 de `paises_destino`. Devuelve un `Map<iso2, n>` sin ceros. El índice "Países con becas abiertas" usa el **mismo Map**, porque es el equivalente accesible del globo.

**Sugerencias de vacío:** para cada dimensión activa (q, soy, nivel, area, cobertura, idioma, estado) se recalcula `conteos.principales` quitando la dimensión entera. Se devuelven las 3 con `n > 0`, de mayor a menor. `pais` se excluye, porque la página de país tiene su propio vacío. Para "Maestría (12)", `conteosFaceta` calcula cada opción con el resto de filtros activos, sin contar la propia dimensión.

**Contador de home:** `resumenCatalogo(becas)` sin filtros. `abiertas` cuenta abierta + cierra_pronto, `paises` es el tamaño del Map sin filtros y `ultimaVerificacion` es el máximo de `verificado_el`.

**Casos de test unitarios** (vitest, en `lib/filtrarBecas.test.ts` con fixtures tipados):
1. Sin filtros: cerrada fuera de los principales y `conteos.cerradas` correcto. Con `cerradas: true`, aparece ordenada por deadline desc.
2. `por_confirmar` nunca está en principales ni en `agregarPorPais`.
3. Rolling con `estado='abierta'` va en `continua` y cuenta en el globo. Rolling con `estado='por_confirmar'` va en `porConfirmar`.
4. Soy CO: entran elegibles con [CO,PE], abierta_a_todas y sin dato. Queda fuera la de [MX].
5. Beca con `abierta_a_todas=true` y lista [MX]: con soy CO, entra.
6. Área `ciencias-salud`: entra la beca con `['todas-las-areas']`.
7. Idioma `['es']`: entran `{es}`, `{en,es}` y `{}`. Queda fuera `{de}`.
8. q "espana" encuentra la beca con destino ES ("España"). "DAAD" encuentra "daad" en institución. q "a" se ignora.
9. q con 2 tokens "alemania doctorado", donde "doctorado" solo está en el título: exige ambos.
10. Orden cierranPronto: la de deadline más temprano va primero. Con deadline igual, orden por título.
11. `agregarPorPais` con multi-destino [DE, FR] suma 1 a cada uno. Con `pais: 'DE'` en los filtros, el Map sigue teniendo FR.
12. **Oráculo:** `agregarPorPais(becas, filtrosVacios)` coincide con `paises_con_becas.n_abiertas`. Es un test de integración manual o script de `frontend` contra la BD y no forma parte del runtime.
13. `sugerenciasVacio` con nivel=[posdoc] y cobertura=[total] y 0 resultados: devuelve las dimensiones con n > 0, en orden desc y máximo 3.
14. `conteosFaceta('nivel')` ignora el propio filtro de nivel.
15. Estado `['cierra-pronto']`: `conFecha` y `continua` quedan vacíos; `porConfirmar` y `cerradas` no cambian.
16. Beca con `paises_destino=[]`: aparece en la lista y no suma en el Map.
17. `plazoVencido`: fija, estado abierta y deadline pasado respecto a `ctx.ahora` da true.
18. Función pura: no muta `becas` (lo comprueba `Object.freeze` en los fixtures).

`lib/url.ts` y `lib/fechas.ts` también llevan tests:
- round-trip de parseo y serialización;
- valores inválidos se ignoran;
- "15 dic 2026" sin punto;
- `deadline_solo_fecha` con tz null usa `Pacific/Kiritimati` para la fecha oficial;
- `dias_restantes ≤ 1` da "Cierra hoy · menos de 24 h".

## 6. Modelo de URL
- **Path:** `/pais/:iso2` (minúscula). Todo lo demás va en la query con nombres en español, valores múltiples separados por coma y en orden estable:
`?q=erasmus&soy=CO&nivel=maestria,doctorado&area=ciencias-salud&cobertura=total&idioma=en,es&estado=cierra-pronto&cerradas=1`
- **Parámetros:** se omiten los vacíos y valores por defecto. Los valores que no están en el catálogo se ignoran en silencio. Los parámetros `utm_*` se conservan al entrar y se quitan con replace después de registrar el pageview.
- **push:** cambiar de país (globo, índice u hoja) y abrir una beca. Así Atrás vuelve al contexto anterior.
- **replace:** cambios de filtros, "Ver cerradas" y texto. El texto actualiza `q` en la URL tras 250 ms de debounce; el input es local e inmediato.
- **Entre rutas:** "← Todas las becas" conserva la query. Al pasar de país a home y viceversa se conservan los filtros.
- **Compartir:** `https://…/beca/{slug}?utm_source=whatsapp|enlace&utm_medium=share`. WhatsApp usa `https://wa.me/?text=` + encodeURIComponent(`{titulo} — {url}`).
- **Privacidad:** `soy` se elimina de `$current_url` y `$referrer` antes de enviar a PostHog (§8).

## 7. Módulo globo
**Condiciones de R9 (obligatorias)**
1. `polygonsData` = features del GeoJSON, memoizado una sola vez (`useMemo` sobre los datos de la query geo). Nunca se filtra el array.
2. Altitud constante `0,006` para todos los países, se aplica la corrección de FINDING 1. Solo el país en hover (0,018) o seleccionado (0,024) cambia de altitud, siempre que el spike (S4) lo apruebe. Si no, hover y selección solo cambian material y trazo.
3. Los filtros solo cambian `polygonCapMaterial`, `polygonSideMaterial` y `polygonLabel`, mediante `useMemo([counts, hoverIso, seleccion])` sobre `Map<iso2,n>`.
 - Los materiales son **6 instancias compartidas** de `MeshBasicMaterial`: capOff #CFC8B8, capLit #0B6E4F, capOffHover #B8B09E, capLitHover #085A40, sideOff #B8B09E y sideLit #085A40.
 - Se crean una vez en `materiales.ts` y se liberan con `dispose` al desmontar. Nunca se crea un material por polígono ni por render.
4. Debounce de 250 ms solo en el texto. Los demás filtros actualizan al instante.
5. El seleccionado sale del path (`/pais/:iso2`) y no de los conteos. Si queda en 0, sigue seleccionado y la UI dice "0 becas con estos filtros en {país} · Quitar filtros".
6. La leyenda dice "Con becas abiertas hoy" / "Sin becas abiertas hoy" y añade "Según tus filtros" si hay filtros activos.

**Configuración visual** (VISUAL_DIRECTION §7, desde `tokens.ts`)
- **Base:** `backgroundColor=GLOBE.bg`, `showAtmosphere={false}`, `showGraticules={false}`, sin imágenes; `globeMaterial` = `new MeshBasicMaterial({color: GLOBE.ocean})` memoizado.
- **Polígonos:** `polygonStrokeColor` = stroke o strokeActive en hover/selección; `polygonsTransitionDuration` = 200 (0 con reduced-motion).
- **Renderer:** `rendererConfig={{antialias:true, alpha:false, powerPreference:'low-power'}}`; pixel ratio `min(dpr, 2)` en desk y `min(dpr, 1.5)` en móvil.
- **Controles:**
- `autoRotate=false`, `enablePan=false`;
- `enableZoom=false` en desk (botones +/−, altitud 1,4–3,2, paso 0,4);
- pinch solo en pantalla completa móvil;
- damping 0,1 (0 con reduced-motion).
- **Cámara:** vista inicial `{lat:20, lng:-35, altitude:2.2}` (2,6 en pantalla completa móvil).
- **Tooltip:** HTML `polygonLabel` con 100 ms de retardo: "Alemania: 6 becas abiertas" / "Francia: sin becas abiertas hoy".
- **Clic en desk:** `pointOfView({lat,lng,altitude:1.8}, 900)` → navega con push a `/pais/:iso2` → foco en el h1.
- **Clic en móvil:** centra la cámara y abre `HojaPais`.
- **Accesibilidad:** canvas `aria-hidden`, `tabIndex=-1`; el índice de países es el equivalente.
- **Recursos:** se pausa el render (`pauseAnimation`) cuando el globo sale del viewport (IntersectionObserver) y al cerrar la pantalla completa.

**Carga diferida y fallback por motivo** (`GlobeSlot.tsx`)
- **Orden de evaluación:**
1. `sin_webgl`: el test `canvas.getContext('webgl2') || getContext('webgl')` falla.
2. `ahorro_datos`: `navigator.connection?.saveData`.
3. `dispositivo_debil`: `(deviceMemory ?? 8) ≤ 2 || (hardwareConcurrency ?? 8) ≤ 2`. Es una hipótesis (R8) que se ajusta con `globe_fallback_shown`.
4. `reduced_motion`.
- **Desk:** carga automática tras el primer render de la lista (`requestIdleCallback`) salvo en los motivos 2 a 4, que muestran un botón:
- "Cargar globo" + "Usa más datos y batería; la lista tiene la misma información.";
- o "Mostrar globo (sin animaciones)".
- **Móvil:** siempre bajo demanda con "Explorar en el globo". Si falta WebGL, el botón no aparece y se muestra la nota de fallback junto al índice.
- **Errores:** `lazy(() => import('./GlobeCanvas'))` dentro de un ErrorBoundary. Si falla el chunk o el GeoJSON → `error_carga`. Si llega `webglcontextlost` → `contexto_perdido`. En ambos casos se muestra "El globo no está disponible en este dispositivo. Usa la lista de países."
- **Espacio reservado:** la caja se reserva siempre (círculo con borde `--rule` + "Cargando globo…"). CLS = 0.

**GeoJSON**
- **Fuente:** Natural Earth *Admin 0 – Countries* 1:110m, v5.1.x (naturalearthdata.com o el repo `nvkelso/natural-earth-vector`). **Dominio público**: no exige atribución, pero se da crédito en "Cómo verificamos" ("Mapa: Natural Earth").
- **Resolución:** 110m, porque 50m multiplica el peso aproximadamente por 4. 110m omite microestados (Singapur, Malta, Hong Kong…); los cubren el índice y "¿Buscabas…?".
- **Preproceso único** (lo hace `frontend`, que es dueño de `public/geo/` y `scripts/geo/`), con mapshaper:
`-each 'iso2 = ISO_A2 !== "-99" ? ISO_A2 : (ISO_A2_EH !== "-99" ? ISO_A2_EH : null)' -filter-fields iso2,ADM0_A3 -o precision=0.01 format=geojson public/geo/paises-110m.json`
- **Mapeo en runtime** (`geo.ts`): `iso2 ?? isoDesdeIso3(ADM0_A3)` usando `pais.iso3`. Las features sin iso2 resoluble (p. ej. Chipre del Norte, Somalilandia, Kosovo si no está en `pais`) se pintan como tierra y no son clicables. El script registra la lista de no mapeados; hay que comprobar explícitamente que **FR y NO** salen bien.

**SPIKE previo a E6** (lo hace `frontend` en un proyecto Vite desechable fuera del repo de Lovable; sin datos reales, con un Map sintético)

| # | Criterio | Cómo se mide | Éxito |
|---|---|---|---|
| S1 | react-globe.gl 2.38.x acepta `MeshBasicMaterial` en `globeMaterial`, `polygonCapMaterial` y `polygonSideMaterial` | captura + cuentagotas | color renderizado = HEX del token ±2 por canal (sin sombreado); iluminado/apagado ≥ 3:1 |
| S2 | Una sola copia de three | `npm ls three`, consola | una versión; sin el aviso "Multiple instances of Three.js" |
| S3 | Recolorear sin re-teselar | 20 cambios del Map con `polygonsData` estable; `renderer.info.memory.geometries` antes/después; panel Performance | nº de geometrías constante; tarea de recoloreo ≤ 50 ms en desk; interacción de filtro dentro de INP ≤ 200 ms con CPU 4× |
| S4 | Coste del cambio de altitud en hover y selección | lo mismo que S3 en hover | sin fuga de geometrías y tarea ≤ 50 ms; si no, el hover solo cambia color y trazo |
| S5 | Chunk y peso | salida de `vite build`, gzip | el globo NO está en el chunk inicial; se registran el gzip del chunk del globo, del JS inicial y del GeoJSON como línea base (presupuesto = línea base; no se fijan números sin medir) |
| S6 | Móvil medio | Android de gama media real (o DevTools CPU 4× + "Fast 4G" como aproximación) | del tap al primer frame ≤ 3 s *(hipótesis)*; arrastre ≥ 30 fps sostenido *(hipótesis)*; 5 ciclos abrir/cerrar sin crecimiento de geometrías ni texturas |
| S7 | Scroll y rueda | desk con rueda; móvil fuera de pantalla completa | la rueda no hace zoom; la página nunca queda atrapada |
| S8 | Mapeo ISO | salida del script | FR, NO, DE, US, GB, ES, CA, AU, JP, KR y NL mapeados |

**Salida del spike:** un informe con números y un snippet de referencia de `GlobeCanvas` que se adjunta al mensaje E6.

**Reglas de decisión:**
- Si falla S1: se usa `polygonCapColor` con la iluminación que dé el color plano más cercano, se recalculan los contrastes y se consulta a `design-director`.
- Si falla S3 o S6 en móvil: el globo queda solo en desk y el móvil usa el índice. El usuario decide.
- Si Lovable no llega a la calidad en E6: `frontend` toma `src/globe/` en exclusiva, **previa aprobación del usuario**.

## 8. Analítica (PostHog)
**Init** (`analytics/posthog.ts`): se hace un import dinámico de `posthog-js` en `requestIdleCallback` después del primer render, para que no pese en el LCP. `track()` guarda hasta 50 eventos en una cola hasta que termina el init.
```ts
posthog.init(POSTHOG_TOKEN /* lo inyecta la sesión principal */, {
api_host: 'https://us.i.posthog.com',
autocapture: false,
capture_pageview: false,          // manual por cambio de pathname
capture_pageleave: false,
disable_session_recording: true,
persistence: 'memory',            // sin cookies/localStorage hasta que Fase 11 decida consentimiento
person_profiles: 'identified_only',
disable_surveys: true,
advanced_disable_feature_flags: true,
capture_exceptions: true,         // error tracking; verificar nombre de opción en la versión instalada
before_send: sanitizar,           // quita `soy` de $current_url/$referrer; descarta propiedades string > 200
});
```
- **Coste de `persistence: 'memory'`:** una sesión equivale a una pestaña. La métrica estrella (% de sesiones con `official_url_clicked`) sigue siendo medible; la retención a 7 y 30 días **no**. Cuando la Fase 11 apruebe el consentimiento se pasa a `localStorage+cookie` con `set_config`.
- **Pendientes:** `anonymize_ips` se decide en Fase 11 (ajuste del proyecto, no del SDK). Las Web Vitals de campo son opcionales (§13).

**Wrapper tipado** (`analytics/track.ts`)
```ts
type Fuente = 'lista' | 'pais' | 'similares' | 'enlace_compartido' | 'directo';
export type Eventos = {
$pageview: { plantilla: '/' | '/pais/:iso2' | '/beca/:slug' | '/como-verificamos' | '404' };
globe_loaded: { load_ms: number; countries_lit: number; device_class: 'desk' | 'movil' | 'debil'; trigger: 'auto' | 'boton' | 'boton_ahorro' | 'boton_reduced_motion' };
globe_opened: { source: 'home' | 'pais' };
globe_fallback_shown: { reason: 'sin_webgl' | 'contexto_perdido' | 'error_carga' | 'dispositivo_debil' | 'ahorro_datos' | 'reduced_motion' };
country_selected: { country_iso2: string; n_open: number; via: 'globo' | 'indice' | 'hoja_sugerencia' };
search_used: { query_length: number; results_count: number };
filter_applied: { filter: 'soy' | 'nivel' | 'area' | 'cobertura' | 'idioma' | 'estado' | 'cerradas'; value: string; results_count: number; active_filters_count: number };
filters_cleared: { from_empty_state: boolean };
status_group_toggled: { group: 'por_confirmar' | 'cerradas'; enabled: boolean };
empty_results_shown: { context: 'home' | 'pais'; active_filters: string[] /* nombres de dimensión, sin valores */; country_iso2?: string };
empty_suggestion_clicked: { suggestion: 'quitar_filtro' | 'limpiar_todo' | 'ver_todas'; filter?: string };
scholarship_viewed: { slug: string; estado: Estado; tipo_deadline: TipoDeadline | 'sin_convocatoria'; source: Fuente };
official_url_clicked: { slug: string; estado: Estado; dias_restantes: number | null; verificacion_antigua: boolean; placement: 'cta_principal' | 'cta_cerrada' };
share_clicked: { target: 'whatsapp' | 'copiar'; page: 'beca'; slug?: string };
report_error_clicked: { slug: string /* 'general' desde el pie */ };
scholarship_not_found: { slug: string };
data_load_failed: { resource: 'becas' | 'beca_detalle' | 'paises' | 'areas' | 'config' | 'geo'; error_kind: 'red' | 'http_4xx' | 'http_5xx' | 'desconocido'; retry_count: number };
};
export function track<E extends keyof Eventos>(evento: E, props: Eventos[E]): void;
```
Regla de privacidad: `filter_applied` con `filter:'soy'` envía `value: 'definido' | 'vacio'`, nunca el código del país, hasta que decida la Fase 11. `search_used` no envía el texto.

**Dónde se dispara**

| Evento | Dónde |
|---|---|
| `$pageview` | `usePageviews` en AppLayout, al cambiar `pathname` (no la query) |
| `globe_loaded` | `GlobeCanvas` en `onGlobeReady` (load_ms desde el trigger) |
| `globe_opened` | botón "Explorar en el globo" (móvil) |
| `globe_fallback_shown` | `GlobeSlot` al resolver el motivo (una vez por montaje) |
| `country_selected` | clic en globo, enlace del índice, sugerencia de la hoja |
| `search_used` | al asentarse `q` (1000 ms sin teclear y longitud ≥ 2), una vez por valor |
| `filter_applied` | cada cambio de filtro (chips, popovers, Sheet al pulsar "Ver N becas", Soy de) |
| `filters_cleared` | "Limpiar filtros" / "Limpiar todos los filtros" |
| `status_group_toggled` | plegable "Por confirmar", "Ver también las cerradas" |
| `empty_results_shown` | EmptyState al montarse (y al cambiar la combinación de filtros) |
| `empty_suggestion_clicked` | cada sugerencia del vacío |
| `scholarship_viewed` | BecaPage cuando `useBeca` resuelve con datos (source desde `location.state.desde` o `utm_medium=share`) |
| `official_url_clicked` | `CtaOficial` en onClick (con `transport: 'sendBeacon'`) |
| `share_clicked` | "Compartir por WhatsApp", "Copiar enlace" |
| `report_error_clicked` | "¿Viste un dato incorrecto? Repórtalo" (ficha) y el pie (`general`) |
| `scholarship_not_found` | BecaPage cuando `maybeSingle` da null o el slug no es válido |
| `data_load_failed` | `QueryCache.onError` global tras agotar reintentos |

**Reportar error (Google Forms):** el formulario lo crea el usuario.
- **Campos:**
1. "Beca (código)": texto corto, obligatorio, prellenado con el slug.
2. "¿Qué dato está mal?": casillas, obligatorio. Opciones: fecha límite / enlace oficial / nacionalidades elegibles / cobertura o monto / idioma / otro.
3. "¿Cuál es el dato correcto?": párrafo, opcional.
4. "Enlace a la fuente que lo confirma": texto corto, opcional, con validación de URL.
- **Ajustes:** sin recoger correos, sin exigir inicio de sesión, sin límite de una respuesta. Si se quisiera un correo de contacto, sería opcional y con aviso, a decidir en Fase 11.
- **Enlace:** `https://docs.google.com/forms/d/e/{REPORT_FORM_ID}/viewform?usp=pp_url&entry.{REPORT_ENTRY_SLUG}={slug}`.
- **Configuración:** `REPORT_FORM_ID` y `REPORT_ENTRY_SLUG` son constantes públicas en `src/lib/config.ts`. El id de entrada se obtiene con "Obtener enlace prellenado" en Forms. El enlace lleva `target="_blank" rel="noopener noreferrer"`.

## 9. Plan de construcción en Lovable (Lovable es el único escritor de UI)
**Reglas generales:**
- Un mensaje equivale a un cambio verificable.
- Después de cada mensaje, la sesión principal ejecuta `get_diff`, revisa la vista previa a 375 px y a 1280 px (puntero fino) y comprueba el checklist de la etapa.
- `frontend` revisa `data/`, `lib/` y `globe/`, y ejecuta los tests en local (requiere el repo en GitHub).
- Si algo falla, el siguiente mensaje es una corrección acotada, nunca un "rehazlo".
- Presupuesto aproximado: unos 20 a 25 mensajes, que consumen créditos del workspace del usuario.

**Grep en cada `get_diff`:**
- `select('*')` y `from('beca')`, `from('convocatoria')`, `from('institucion')` o `from('paises_con_becas')`;
- `service_role`, `secret`;
- `Inter`, `googleapis`;
- `rounded-xl`, `rounded-2xl`, `shadow-` (fuera de sheet, popover y select), `gradient`, `backdrop-blur`, `dark:`;
- `<Card` en componentes de becas;
- `#` HEX fuera de `index.css` y `tokens.ts`;
- `localStorage` / `sessionStorage`;
- dependencias nuevas en `package.json`.

**E0 · Crear proyecto y knowledge**
- **Lovable:**
- `create_project` con un mensaje inicial mínimo: "Crea una SPA con React 18 + TypeScript + Vite, react-router-dom, Tailwind v3 y shadcn/ui. Sin SSR. No actives Lovable Cloud ni conectes Supabase. Solo una página con el texto 'En construcción'. No generes diseño todavía."
- Después, `set_project_knowledge` con el texto de abajo.
- Conectar GitHub desde Lovable (integración nativa, repo **privado**), si el usuario lo aprueba (§13).
- **Aceptación:** `package.json` sin `@supabase/*` ni configuración de Lovable Cloud. Existen `vite.config.ts` y `src/main.tsx`. El knowledge está guardado.
- **Verifica:** la sesión principal. Después sube al repo `supabase/` y `.project/` si se decide versionarlos.

**Texto de `set_project_knowledge`** (aproximadamente 6.300 caracteres, dentro del límite de 10.000):
```
becasuapp — reglas permanentes (no negociables)

PRODUCTO
Buscador de becas internacionales verificadas a mano. Promesa: "Becas abiertas hoy, verificadas en la fuente oficial." La veracidad está por encima de todo: nunca inventes becas, fechas, montos, instituciones ni textos de ejemplo en código de producción. Si falta un dato, muestra "Consultar convocatoria". UI en español neutro latinoamericano con tuteo, sin emojis. Usa literalmente el microcopy que te dé en cada mensaje.

STACK
React 18 + TypeScript + Vite (SPA, sin SSR), react-router-dom (createBrowserRouter + ScrollRestoration), Tailwind v3, shadcn/ui, lucide-react (strokeWidth 1.75), @tanstack/react-query, @supabase/supabase-js, @fontsource/newsreader, @fontsource/ibm-plex-sans, tailwindcss-animate. posthog-js y react-globe.gl solo cuando te lo pida. No añadas otras dependencias sin preguntar.
NO actives Lovable Cloud. NO uses la integración de Supabase de Lovable para crear tablas, migraciones, políticas RLS, funciones, edge functions ni SQL. El esquema lo mantiene otro equipo: si crees que falta un dato, dilo y detente.
No modifiques: supabase/, .github/, .project/, public/geo/, scripts/.

DATOS (Supabase, solo lectura)
- Cliente único en src/data/supabaseClient.ts con URL y publishable key (públicas) y auth { persistSession:false, autoRefreshToken:false, detectSessionInUrl:false }. Nunca uses ni pidas claves service_role o secret.
- Solo lees: vistas becas_publicas y beca_detalle, y tablas pais, area, config. Siempre select con columnas explícitas (constantes COLS_LISTA / COLS_DETALLE), nunca select('*'). Prohibido consultar beca, convocatoria, institucion, tablas N:M o paises_con_becas.
- estado y dias_restantes vienen de la vista: no los recalcules.
- Los componentes no importan el cliente: todo pasa por los hooks de src/data (TanStack Query, retry máx. 2 solo en errores transitorios).
- Sin caché persistente: nada de datos en localStorage, sessionStorage ni IndexedDB.
- Filtrado, orden, agrupación y conteos SOLO con las funciones puras de src/lib/filtrarBecas.ts (compartidas por lista, país y globo). No dupliques lógica de filtros en componentes.

ESTRUCTURA
src/routes (páginas), src/layouts, src/data, src/lib, src/search, src/globe (no importa src/data), src/analytics (único que importa posthog-js), src/ui (componentes propios), src/components/ui (shadcn), src/dev/fixtures. No crees carpetas nuevas sin avisar.

ESTILO "Boletín en dos tintas"
- Colores solo con los tokens de src/index.css y tailwind.config (paper, surface, ink, ink-2, rule, row-hover, signal, signal-strong, signal-tint, status.*, error.*). Ningún HEX en componentes; las constantes del globo están en src/lib/tokens.ts.
- Verde (signal) SOLO para: estado Abierta y postulación continua, países iluminados del globo, botón primario y botones que llevan a becas abiertas. Enlaces de cuerpo en tinta subrayada. Selección en tinta. Urgencia en ocre (status-soon). Error en rojo ladrillo (error).
- Tipografía: Newsreader (títulos, 500/600) e IBM Plex Sans (UI y cuerpo, 400/500/600) desde @fontsource importadas en main.tsx. Clase .num (tabular-nums) en fechas, conteos, días y montos.
- Radio 4 px (chips 2 px; Sheet 8 px arriba). Separar con filetes (border-rule), nunca con sombras. Sombra solo en Sheet, Popover, Select y Command.
- Becas en tablero: <ol> de <article> con filete inferior; columna de estado fija a la izquierda y columna de cierre a la derecha desde sm. Cada beca lleva nota de fuente ("Verificado el 12 sep 2026 · daad.de").
- Estados siempre con texto + icono (Circle relleno, Clock, RefreshCw, CircleDashed, Lock), nunca solo color.
- Fechas "15 dic 2026" (Intl es-CO, sin punto) con los helpers de src/lib/fechas.ts.
- Breakpoint desk = (min-width:1024px) and (pointer:fine). Móvil primero.
- Motion solo funcional; respeta prefers-reduced-motion.

QUÉ NO UTILIZAR (nunca)
Gradientes; glassmorphism o blur; modo oscuro; ámbar claro; verde en enlaces u hovers genéricos; Card de shadcn para becas; rounded-xl, rounded-2xl o rounded-full (salvo punto de estado y radios de formulario); shadow-* en filas, botones, inputs o secciones; hero + 3 tarjetas + CTA; carruseles; blobs; emojis; banderas; logos de instituciones; montos convertidos o estimados; Inter, Roboto o system como fuente principal; Google Fonts CDN; GSAP, Framer Motion, Lottie, three.js a mano; toasts para resultados; modales al entrar; scroll infinito; scroll anidado; en el globo: auto-rotación, atmósfera, estrellas, arcos, puntos, hexbins, texturas, zoom con rueda o captura del scroll.

ACCESIBILIDAD (WCAG 2.2 AA)
HTML semántico, un h1 por página, label visible en inputs, foco visible 2 px tinta + offset 2 px, objetivos ≥ 44 px en táctil, resumen de resultados en live region polite, role="alert" en errores, canvas del globo aria-hidden con el índice de países como equivalente. Enlaces externos con target="_blank" rel="noopener noreferrer" y "(se abre en una pestaña nueva)" en el nombre accesible.

URL
País en el path (/pais/:iso2, minúsculas); filtros en la query en español: q, soy, nivel, area, cobertura, idioma, estado, cerradas. Cambiar país o abrir beca = push; filtros y texto = replace (texto con debounce de 250 ms). Parseo y serialización solo en src/lib/url.ts.

ANALÍTICA Y PRIVACIDAD
Solo mediante track() de src/analytics (eventos tipados). Sin autocapture ni session replay. No envíes texto del buscador, nombres, correos ni el código de nacionalidad. No añadas otros servicios de terceros.

FORMA DE TRABAJAR
Haz solo lo que pide cada mensaje; no rediseñes lo ya aprobado. Si algo no está especificado, pregunta en vez de inventar. Datos ficticios solo en src/dev/fixtures (títulos con prefijo "[FICTICIA]", URLs https://example.org/...), cargados únicamente si import.meta.env.DEV y ?fixtures=1; nunca en producción.
```

**E1a · Tokens, fuentes, layout y rutas vacías.** Se pegan literalmente VISUAL_DIRECTION §2 (escala y carga de fuentes), §3 (bloque CSS completo y `theme.extend`), la regla de reduced-motion de §8, `tokens.ts` de §3 de este blueprint, AppLayout (encabezado y pie de §4) y el router de §2 con páginas vacías, más `useDocumentMeta`.
- **Aceptación:**
- Las fuentes se sirven desde el propio origen (sin googleapis).
- `.num` cambia el ancho de "1111" frente a "0000".
- `tailwind.config` sin Inter y con `screens.desk` (raw).
- Existen las 5 rutas; `/pais/DE` redirige a `/pais/de`.
- La recarga directa de `/beca/x` funciona en la vista previa.
- **get_diff:** tokens idénticos a VISUAL_DIRECTION §3; sin `.dark`; `--accent` neutro.
- **Verifica:** la sesión principal. `frontend` mide la línea base del JS inicial.

**E1b · Capa de datos.** Se pegan §4 completo (cliente, tipos, columnas, fetchers, hooks, QueryClient) y los fixtures de desarrollo (§10).
- **Aceptación:**
- En Network: `GET /rest/v1/becas_publicas?select=id,slug,...&order=deadline_at.asc.nullslast`.
- Sin claves `sb-*` en localStorage.
- Con 0 becas reales se recibe `[]` sin error.
- Con `?fixtures=1` en desarrollo se ven las ficticias con el aviso "Datos ficticios de desarrollo".
- El bundle de producción no contiene "[FICTICIA]".
- **Verifica:** `frontend` (revisión de `data/` y petición con anon).

**E2.1 · Lógica pura (sin UI).** `lib/normalizar.ts`, `lib/filtrarBecas.ts`, `lib/url.ts` y `lib/fechas.ts` con sus tests (§5 y §6 literales, incluidos los 18 casos).
- **Aceptación:** vitest en verde, lo ejecuta `frontend` en local. Ningún import de React en `lib/filtrarBecas.ts`.
- **get_diff:** la semántica de soy, área comodín, idioma y grupos coincide con §5.

**E2.2 · Home móvil en `plan_mode`.** Se describen VISUAL_DIRECTION §4 "Home móvil" (orden 1-14) y §5 (fila, insignia, sello, estados de carga) y se pide el plan sin escribir código.
- **Aceptación:** el plan usa `<ol>`/`<article>`, sin Card, con filetes, y cita los tokens.
- **Verifica:** la sesión principal y `design-director` si hay dudas de estilo.

**E2.3 · Construir la home móvil** con el plan aprobado, sin filtros avanzados todavía (buscador visible pero inactivo).
- **Aceptación con `?fixtures=1`:**
- contador con singular y plural;
- tramos "Cierran en los próximos 30 días", "Con fecha de cierre" y "Abiertas · postulación continua";
- "Mostrar 20 más (quedan N)";
- plegable "Por confirmar (N)" cerrado;
- "Ver también las cerradas (N)";
- índice de países en 2 columnas;
- esqueletos con `aria-busy`.
- **Revisión:** en 375 px sin scroll horizontal; checklist de VISUAL_DIRECTION §10, puntos 1-4, 6-8 y 14.

**E3 · Buscador, filtros y URL.**
- **Contenido:**
- SearchBox con debounce;
- SoySelect ("Cualquier nacionalidad" + nota);
- FiltrosSheet (92dvh, fieldsets, pie "Ver N becas" en vivo, el foco vuelve al disparador);
- conteos por faceta;
- resumen en live region;
- EmptyState con sugerencias;
- sincronización con la URL (§6);
- "Limpiar filtros";
- el filtro de idioma solo si hay datos.
- **Aceptación:**
- Recargar con la query reproduce el estado.
- Atrás no recorre cada tecla.
- "espana" encuentra España.
- "Quitar «Doctorado» → 4 becas" funciona.
- **Verifica:** `frontend` (URL y tests).

**E4 · Ficha `/beca/:slug`.**
- **Contenido:**
- bloque de cierre con zona oficial + "En tu hora" + aviso sin zona;
- CtaOficial (56 px, dominio, nombre accesible);
- nota de fuente completa;
- `<dl>` de datos clave (monto `Intl.NumberFormat` con código de moneda + periodo "al mes / al año / en total / pago único");
- requisitos;
- próxima convocatoria (ver §13-6);
- compartir y copiar con confirmación en línea;
- reportar (enlace a Forms);
- cerrada → CTA secundario + 3 similares (misma área o nivel o destino, solo abiertas);
- no encontrada;
- meta.
- **Aceptación:**
- enlace directo en frío funciona;
- `rel="noopener noreferrer"`;
- slug inexistente → "No encontramos esta beca" + `noindex`;
- `deadline_solo_fecha` sin tz muestra el aviso literal.

**E5 · País `/pais/:iso2`.**
- **Contenido:** "← Todas las becas" (conserva la query), h1, conteo "N becas abiertas · M por confirmar", tablero filtrado, estado 0 abiertas, estado 0 con filtros (sin deseleccionar), iso2 no válido → 404.
- **Aceptación:** en móvil, "Explorar en el globo" bajo el h1 (el botón queda inactivo hasta E6).

**E6 · Globo** (solo con el spike aprobado). Primero `plan_mode` con §7 de este blueprint, el informe del spike y el snippet de referencia de `frontend`; después la construcción.
- **Contenido:** GlobeSlot, GlobeCanvas lazy, materiales compartidos, leyenda, zoom, pantalla completa móvil (Atrás cierra), HojaPais con "¿Buscabas…?", columna del globo en desk dentro de ExploreLayout.
- **Aceptación:**
- chunk separado;
- cambiar filtros no altera `renderer.info.memory.geometries`;
- la rueda no hace zoom;
- fallback con cada motivo (forzado con un flag de desarrollo);
- canvas `aria-hidden`;
- FR y NO clicables.
- **Verifica:** `frontend` en exclusiva sobre `globe/`. Si no alcanza calidad tras 2 correcciones, se escala al usuario (toma de `globe/` por `frontend`).

**E7 · Analítica.** Contenido de §8: init diferido con la cola, `track` tipado, `usePageviews`, `sanitizar` y las 17 llamadas en los puntos de la tabla. El token lo pasa la sesión principal en el mensaje.
- **Aceptación** (PostHog, proyecto 636672, "Activity" en vivo): llegan los 17 eventos con las propiedades tipadas, sin `$autocapture` ni `$snapshot`, sin `soy=` en las URL y sin cookies ni localStorage de PostHog.
- **Verifica:** la sesión principal vía el MCP de PostHog. `value-impact` valida el embudo de la métrica estrella.

**E8 · Estados y páginas restantes.**
- **Contenido:**
- error con Reintentar (forzado con URL inválida en desarrollo);
- temporada baja;
- "Plazo vencido · actualizando";
- 404;
- "Cómo verificamos" (texto que redacta la sesión principal a partir de decisions.md: fuente oficial, fecha de verificación, estado automático, zona horaria conservadora, umbrales 30/120 leídos de config, sin montos inventados, cómo reportar, crédito de Natural Earth);
- pie con "Reportar un error" (`general`).
- **Aceptación:** checklist de VISUAL_DIRECTION §10, punto 13, completo.

**E9 · Responsive desk.**
- **Contenido:**
- ExploreLayout con el grid `minmax(360px,1fr) minmax(560px,680px)`, globo sticky y plegable "Lista de países (N)";
- FiltrosBarDesk con Popovers + checkboxes;
- encabezado `rubric` del tablero;
- ficha con aside sticky (cierre, CTA y nota);
- encabezado de 64 px.
- **Aceptación:**
- a 1280 px con puntero fino, dos columnas;
- una tablet táctil de 1024 px se comporta como móvil;
- el globo persiste entre `/` y `/pais`;
- CLS al volver de la ficha < 0,1.
- **Verifica:** la sesión principal, más la preparación de la Fase 8.

## 10. Datos para desarrollo (sin datos falsos en producción)

| Opción | Coste y riesgo | Veredicto |
|---|---|---|
| Rama de Supabase | Requiere Pro | No, salvo que se pague Pro |
| 2.º proyecto gratuito "dev" | Gasta el **último cupo**, que es el destino de la restauración (D9); también se pausa; deriva de esquema | **No** |
| Supabase local (CLI + Docker) | Lovable no lo alcanza; útil solo para `frontend` y `database` | Opcional para pruebas de `database` |
| **Fixtures locales solo en desarrollo** | Riesgo de que se filtren al bundle, mitigable | **Sí** |
| **Becas reales tempranas en producción** | El usuario cura 5-10 becas reales | **Sí** (hace falta de todos modos) |

**Recomendación:** combinar fixtures locales y becas reales tempranas.
- **Fixtures en `src/dev/fixtures/becas.ts`:**
- unas 12 becas tipadas `BecaPublica[]` con `Object.freeze`, títulos "[FICTICIA] …" y `url_oficial` en `https://example.org/…` (dominio reservado);
- cubren: cierra_pronto, abierta con fecha, rolling abierta, rolling antigua (por_confirmar), sin convocatoria, cerrada con próxima apertura, sin zona horaria, `deadline_solo_fecha`, multi-destino, sin dato de nacionalidad, `idiomas_requeridos` vacío y lleno, monto con periodo, verificación antigua, destino FR/NO y destino microestado (SG);
- se cargan con `if (import.meta.env.DEV && new URLSearchParams(location.search).has('fixtures')) await import('../dev/fixtures/becas')`, con banner fijo "Datos ficticios de desarrollo";
- son los mismos que usan los tests.
- **Por verificar en E1b:** si la vista previa de Lovable corre en modo desarrollo. Si no, los fixtures solo sirven para tests y para `frontend` en local, y la vista previa se valida con las becas reales tempranas.
- **Control:** la Fase 8 hace grep de "[FICTICIA]" y "example.org" en el build publicado.
- **Becas reales:** el usuario publica 5-10 becas reales por el flujo borrador → publicada antes de E2.3. Validan el contrato real y la prueba con perfiles.

## 11. Criterios de aceptación del MVP y Fase 8
**Criterios de aceptación del MVP**
1. Solo se muestran becas publicadas y reales. Cada fila y cada ficha lleva la URL oficial y "Verificado el…".
2. El estado viene de la vista. Cerrada y por_confirmar no iluminan el globo ni cuentan en el contador.
3. El oráculo se cumple: `agregarPorPais` sin filtros coincide con `paises_con_becas`.
4. Filtros, búsqueda sin tildes, "Soy de" con la semántica de §5, "Ver cerradas" y URL compartible reproducible.
5. El globo refleja los filtros sin re-teselar. Fallback por cada motivo. La lista nunca espera al globo.
6. El deadline se muestra en la zona oficial y "en tu hora", con el aviso conservador cuando falta zona.
7. Todos los estados de VISUAL_DIRECTION §10, punto 13, están presentes.
8. Los 17 eventos llegan tipados, sin PII y sin `soy` en las URL.
9. Ninguna consulta a tablas base, ningún `select=*` y ningún rastro de service_role en el bundle.
10. WCAG 2.2 AA: axe sin errores serios; recorrido con teclado completo; NVDA y VoiceOver en la home, el filtro, la ficha y el CTA.
11. Core Web Vitals "good" en p75: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1.
12. El backup semanal se ha ejecutado al menos una vez y se ha probado una restauración.

**Qué audita la Fase 8** (solo leen; los hallazgos se asignan a Lovable o a `frontend` en `globe/`)
- **quality + `reviewing-interface-quality`:**
- checklist de VISUAL_DIRECTION §10 (15 puntos), literal;
- greps de §9;
- tests en verde;
- fronteras de módulos (§3): `globe/` sin `data/`, filtrado solo en `lib/`.
- **security:**
- petición con la anon key a `beca?select=*` → denegada;
- bundle sin claves secretas;
- `rel` en enlaces externos;
- payloads de PostHog sin PII;
- sin almacenamiento local;
- dependencias (`npm audit`).
- **reliability:**
- reintentos (2) y errores tipados;
- fallback de WebGL y pérdida de contexto;
- comportamiento con Supabase pausado (mensaje de error correcto);
- `data_load_failed` en PostHog;
- backup y restauración (§12).
- **Rendimiento:**
- Lighthouse móvil (Moto G Power emulado, "Slow 4G") en `/`, `/pais/de` y `/beca/:slug`;
- INP al filtrar con el globo cargado (CPU 4×);
- peso del JS inicial frente a la línea base de E1a y del chunk del globo frente al spike (S5).
- Presupuesto: no crecer más de un 10 % sobre la línea base sin justificación. Si se pasa, primer candidato: sustituir supabase-js por `@supabase/postgrest-js`.
- **Opcional:** Web Vitals de campo vía PostHog (`capture_performance.web_vitals`), a decidir en §13.

## 12. Backup (D9)
- **Qué:** `supabase db dump` del esquema (`schema.sql`) y de los datos (`data.sql`, `--data-only`) del esquema `public`. Las migraciones ya están en el repo.
- **Cómo:** un GitHub Action `.github/workflows/backup.yml` (dueño: sesión principal y `reliability`; comando definido por `database`):
- se programa con `schedule: cron '0 6 * * 1'` (lunes 06:00 UTC) y `workflow_dispatch`;
- usa el secreto `SUPABASE_DB_URL` = cadena del **pooler de sesión** (Supavisor, puerto 5432, compatible con IPv4, porque los runners no tienen IPv6 y la conexión directa del plan gratuito es IPv6);
- CLI de Supabase con `supabase/setup-cli`;
- `actions/upload-artifact` con `retention-days: 90`.
- **Privacidad:** el repo tiene que ser **privado**, porque el dump incluye `verificado_por`. Si no lo es, se cifra con `age` y una clave pública, guardando la privada fuera de GitHub.
- **Cuándo:** se configura en la Fase 7, en cuanto exista el repo en GitHub y antes de cargar el catálogo real a escala. Primera ejecución manual.
- **Prueba de restauración:** antes del lanzamiento y luego trimestral, en un Postgres local (Docker), **no** en el cupo gratuito. Se aplican las migraciones más `data.sql` y se comprueba que las vistas devuelven lo mismo que en producción.
- **Restauración real (DR):** proyecto nuevo en el cupo libre + migraciones + `data.sql` + cambio de URL y key en `supabaseClient.ts`. RTO de horas; RPO ≤ 7 días. Recomendación: además, un dump manual tras cada sesión grande de curación.
- **Dependencia de GitHub:** sin repo en GitHub no hay backup automático. La alternativa temporal es que el usuario ejecute el dump a mano cada semana, frágil.
- **No verificado:** si el dump semanal cuenta como "actividad" para evitar la pausa del plan gratuito. No hay que depender de ello.
- **Terminología:** esto es backup. No hay replicación, redundancia ni failover (PUF aceptado: Supabase us-east-1). El plan Pro elimina la pausa, pero no añade redundancia multirregión.

## 13. Decisiones abiertas del usuario
1. **Cliente de Supabase:** manual con la publishable key (recomendado: mínimo privilegio, Lovable no puede tocar el esquema) o integración nativa de Lovable.
2. **GitHub:** conectar la integración nativa de Lovable a un **repo privado**. Bloquea tests en local, el asset del GeoJSON, el backup (D9) y la consolidación de `supabase/migrations`.
3. **Significado de `idiomas_requeridos`:** "acepta cualquiera de" (OR, recomendado) o "exige todos" (AND). Se documenta en `supabase/README.md` para los curadores.
4. **PostHog `persistence: 'memory'`** hasta la Fase 11 (sin cookies; se pierde la retención a 7 y 30 días) o `localStorage` desde el inicio con aviso. Además: ¿activar Web Vitals de campo?
5. **Próxima convocatoria:** mostrar "Próxima apertura: oct 2026 · confirma en la fuente oficial" con el dominio de `url_oficial` (sin migración), o que `database` exponga `url_fuente` de la próxima (cambio 11d).
6. **Google Form:** crearlo con los 4 campos de §8 y pasar `REPORT_FORM_ID` y el id de `entry`.
7. **Nombre visible (wordmark y títulos):** hoy es la constante provisional `NOMBRE_APP = 'becasu'`.
8. **Supabase Pro** antes del lanzamiento, por la pausa del plan gratuito (pendiente desde D1).

## Riesgos del blueprint
- **B1:** Lovable ignora el knowledge (Inter, Card, sombras) → greps en cada `get_diff` y correcciones acotadas.
- **B2:** el globo no alcanza calidad o rendimiento → spike previo; plan B solo desk; toma de `globe/` por `frontend` con aprobación.
- **B3:** fixtures filtrados a producción → gate por DEV + grep en Fase 8.
- **B4:** sin GitHub no hay tests en local, backup ni asset del GeoJSON.
- **B5:** caché de 5 min frente a deadlines → `plazoVencido` + refetch al volver el foco.
- **B6:** heurística de dispositivo débil → ajustar con `globe_fallback_shown`.
- **B7:** 110m omite microestados → índice y "¿Buscabas…?".
- **B8:** consumo de créditos de Lovable con unos 25 mensajes.

---


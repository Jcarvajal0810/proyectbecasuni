# BLUEPRINT DELTA — Stack fijo de Lovable (TanStack Start) · 2026-09-29
Agente: architect · Estado: **aprobado 2026-09-29** (decisiones: SSR A, subdominio lovable.app solo texto, plan B globo preaprobado, eliminar deps prohibidas + añadir ssr-query). Complementa y, donde choca, **prevalece** sobre PROJECT_BLUEPRINT.md §0, §1.7, §2, §3, §4, §6, §7, §8, §9, §11 y VISUAL_DIRECTION §3 (bloque CSS) y §8 (tailwindcss-animate → tw-animate-css).

Stack real (package.json verificado por PM): TanStack Start 1.168.32 (SSR, nitro 3.0.260603-beta), @tanstack/react-router 1.170.18 (file-based), React 19.2, Tailwind 4.2 (@tailwindcss/vite, `src/styles.css`), tw-animate-css, shadcn/Radix, @tanstack/react-query 5.101, lucide-react 0.575, zod 3.25, Vite 8.1.5, bun. Incluye `src/lib/lovable-error-reporting.ts`, que solo reporta dentro del editor de Lovable.

## Hallazgos
1. **D2 enmendado.** La app es un monolito sin backend propio, con SSR gestionado por la plataforma. Quedan prohibidos `createServerFn`, las rutas de servidor y los secretos. Cambia el punto único de fallo:
   - si cae el runtime SSR, cae el sitio;
   - si cae Supabase, `/beca` y `/pais` muestran ErrorPagina desde el servidor.
2. **R2/F8 resuelto.** `head()` con los datos del loader da vista previa real en WhatsApp y SEO en `/beca` y `/pais`.
3. **Riesgos nuevos:**
   - hidratación: `now()`, zona horaria e ICU del servidor pueden no coincidir con los del cliente;
   - un QueryClient a nivel de módulo mezclaría datos de distintas peticiones;
   - peticiones duplicadas si no se deshidrata;
   - el globo no puede ejecutarse en SSR;
   - PostHog no ve los errores del SSR.
4. **Tailwind v4 permite imponer "Qué no utilizar".** Reseteando `--color-*`, `--shadow-*` y `--radius-*`, las clases genéricas dejan de existir.
5. **Serialización de la búsqueda.** El router hace JSON.parse de la query por defecto, así que se necesitan `parseSearch`/`stringifySearch` propios.
6. **Scroll.** Los filtros navegan con `resetScroll: false`.
7. **Carpetas.** `src/routes/` queda solo para archivos de ruta; las páginas van en `src/paginas/`.
8. **`lovable-error-reporting.ts`.** Hay que comprobar con grep que no envía nada en producción.
9. **Dependencia a añadir.** `@tanstack/react-router-ssr-query` evita peticiones duplicadas.

## Δ§0 Arquitectura
**Arquitectura:**
- App TanStack Start con SSR que solo renderiza.
- HTML y meta reales en `/beca/$slug` y `/pais/$iso2` mediante loaders que leen Supabase con la publishable key.
- Lista y filtrado en cliente con una función pura.
- Globo como chunk solo de cliente y opcional.
- Sin backend propio (sin server functions, rutas API ni secretos), sin caché persistente y sin auth.

**Descartados:**
- SPA pura con `ssr:false` global: queda como plan de salida.
- SSR de la lista: amarra el TTFB a Supabase y aumenta el riesgo de hidratación.
- Server functions para ocultar la key: la key es pública por diseño.
- Caché en memoria del servidor.

## Δ§1.7 Alcance
- **Dentro:** SSR de meta y contenido de `/beca/$slug`, `/pais/$iso2` y `/como-verificamos`.
- **Fuera:** SSR de la lista, prerender, sitemap, og:image dinámica y modo oscuro.

## Δ§2 Rutas (TanStack Router por archivos; `routeTree.gen.ts` es generado)
```
src/routes/
  __root.tsx                   shell <html lang="es"> + <HeadContent/> + <Scripts/>; component = AppLayout; notFoundComponent; head() global
  _explorar.tsx                layout SIN path: validateSearch (lib/url.ts); desk: grid 2 col con globo sticky; <Outlet/>. El globo PERSISTE entre / y /pais
  _explorar/index.tsx          → /
  _explorar/pais.$iso2.tsx     → /pais/$iso2   (beforeLoad normaliza; loader países)
  beca.$slug.tsx               → /beca/$slug   (loader detalle + países; sin globo)
  como-verificamos.tsx         → /como-verificamos (loader config, nunca lanza)
```
**`router.tsx`.** Crea el QueryClient **por petición** y llama a `createRouter` con:
- `context: { queryClient }`;
- `scrollRestoration: true`;
- `defaultPreload: 'intent'`, `defaultPreloadStaleTime: 0`;
- `parseSearch` y `stringifySearch` de `lib/url.ts`;
- `defaultErrorComponent: ErrorPagina` (Reintentar → `router.invalidate()`);
- `defaultNotFoundComponent`.

Después, `setupRouterSsrQueryIntegration({ router, queryClient })`. Raíz con `createRootRouteWithContext<{queryClient}>()`.

| Ruta | Loader (servidor) | Cliente | head() |
|---|---|---|---|
| `/` | — | useBecas, usePaises, useAreas, useConfig; globo lazy en desk | estático + og + canonical |
| `/pais/$iso2` | ensureQueryData(paisesQO); notFound si no existe | igual que `/` | "Becas para estudiar en {nombre} abiertas hoy \| …", sin cifras |
| `/beca/$slug` | regex del slug → notFound; Promise.all(detalle, países); si es null → notFound | useSuspenseQuery hidratado; useBecas solo para "similares" | "{titulo} · {institucion} \| …"; **sin estado, días ni fechas en meta/og** |
| `/como-verificamos` | ensureQueryData(configQO).catch(()=>null) | — | "Cómo verificamos \| …" |
| 404 | — | — | "Página no encontrada" + noindex |

**Normalización del país en `beforeLoad`:**
- lowercase;
- regex `^[a-z]{2}$` o notFound;
- redirect 301 a minúsculas conservando search.

**Estado efímero en `HistoryState`** (`desde`, `globo`, `visibles`), nunca en la query:
- Globo móvil a pantalla completa: push con state (verificar; si no funciona, `?globo=1`).
- "Mostrar 20 más": replace + `resetScroll: false`.
- Volver: `history.back()` si hay `desde`.

Desaparecen `useDocumentMeta`, `createBrowserRouter` y `ScrollRestoration`.

## Δ§3 Estructura
```
src/router.tsx · src/styles.css · src/routes/ (solo rutas finas) · src/paginas/ (HomePagina, PaisPagina, BecaPagina, ComoVerificamosPagina, NotFoundPagina, ErrorPagina)
src/layouts/ (AppLayout, ExploreLayout) · src/data/ (supabaseClient, types, columnas, queries, queryOptions, hooks, queryClient)
src/lib/ (filtrarBecas, normalizar, url, fechas, formato, tokens, config[NOMBRE_APP, SITE_URL, REPORT_FORM_*], useReducedMotion, useDesk, useEsCliente)
src/search/ src/globe/ src/analytics/ src/ui/ src/components/ui/ src/dev/fixtures/
```
**Reglas SSR:**
- No existen `main.tsx` ni `index.css`.
- `useDesk` y `useReducedMotion` usan `useSyncExternalStore` con snapshot de servidor = `false`.
- `useEsCliente()` es `false` en SSR y en el primer render.
- `window`, `document`, `navigator`, `matchMedia`, `IntersectionObserver` y `requestIdleCallback` solo dentro de `useEffect`.
- Lo que depende de la hora o la zona ("En tu hora", "Plazo vencido") se muestra solo con `useEsCliente()` y con la altura reservada.

## Δ§4 Datos y SSR
**Cliente Supabase.** Singleton con `auth { persistSession:false, autoRefreshToken:false, detectSessionInUrl:false }`.
- URL y publishable key como constantes públicas en `src/lib/config.ts`.
- `VITE_*` es opcional y solo para valores públicos.
- Prohibidos `process.env`, cualquier secreto y `service_role`.

**Reglas:**
1. **QueryClient por petición.** En servidor, `retry` es 0; en cliente, hasta 2 reintentos si el error es transitorio. El `onError` de QueryCache llama a `track`.
2. **Carga en loaders.**
   - Los loaders solo hacen `ensureQueryData`, y `react-router-ssr-query` deshidrata e hidrata.
   - Aceptación: con `/beca/x` en frío, el navegador **no** pide `beca_detalle`.
   - Si no se aprueba la dependencia: dehydrate/hydrate manual.
3. **Timeout en servidor.** Con `AbortSignal.timeout(3000)` (hipótesis a ajustar con el TTFB medido), lanza y se muestra ErrorPagina. En cliente, ErrorPagina emite `data_load_failed`.
4. **Lista solo en cliente.** El SSR de `/` y `/pais` pinta la estructura y los esqueletos; el LCP es el h1.
5. **HTML con `Cache-Control: private, no-cache`.**
   - Se prefiere a `no-store` porque este rompe la bfcache.
   - Se fija por la opción `headers` de la ruta raíz (verificar) o con un envoltorio en `server.ts`.
   - Verificar con `curl -sI` en el sitio publicado.
6. **Latencia hacia Supabase us-east-1.** Medir el TTFB p75 del sitio publicado en E1b como línea base, sin objetivos inventados. Mitigación: preload por intención.
7. **zod** solo en `lib/url.ts`.

## Δ§6 URL
- **Path y query.** País en el path `/pais/$iso2` en minúsculas (las mayúsculas dan 301). La query mantiene el formato `?q=&soy=&nivel=a,b&area=&cobertura=&idioma=&estado=&cerradas=1`.
- **Serializar y parsear.**
```ts
const ORDEN = ['q','soy','nivel','area','cobertura','idioma','estado','cerradas','utm_source','utm_medium','utm_campaign'];
export const parseSearch = (s: string) =>
  Object.fromEntries(new URLSearchParams(s.startsWith('?') ? s.slice(1) : s));
export function stringifySearch(o: Record<string, unknown>) {
  const p = new URLSearchParams();
  const claves = [...ORDEN.filter((k) => k in o), ...Object.keys(o).filter((k) => !ORDEN.includes(k)).sort()];
  for (const k of claves) {
    const v = o[k];
    if (v == null || v === '' || v === false || (Array.isArray(v) && v.length === 0)) continue;
    p.set(k, Array.isArray(v) ? v.join(',') : v === true ? '1' : String(v));
  }
  const s = p.toString().replace(/%2C/g, ',');
  return s ? `?${s}` : '';
}
const csv = (re: RegExp) => z.preprocess(
  (v) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : []),
  z.array(z.unknown()).transform((a) =>
    [...new Set(a.filter((x): x is string => typeof x === 'string' && re.test(x)))].sort()),
).catch([]);
const esquema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  soy: z.string().transform((s) => s.toUpperCase()).pipe(z.string().regex(/^[A-Z]{2}$/)).optional().catch(undefined),
  nivel: csv(/^(pregrado|maestria|doctorado|posdoc|curso_corto|intercambio|investigacion)$/),
  area: csv(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  cobertura: csv(/^(total|parcial|no_especificada)$/),
  idioma: csv(/^[a-z]{2}$/),
  estado: csv(/^(cierra-pronto|con-fecha|continua)$/),
  cerradas: z.preprocess((v) => v === '1' || v === 1 || v === true, z.boolean()).catch(false),
  utm_source: z.string().max(50).optional().catch(undefined),
  utm_medium: z.string().max(50).optional().catch(undefined),
  utm_campaign: z.string().max(80).optional().catch(undefined),
});
export type SearchExplorar = z.output<typeof esquema>;
export const validarSearchExplorar = (raw: Record<string, unknown>): SearchExplorar => esquema.parse(raw);
```
- **Validación de la búsqueda.**
  - `_explorar` usa `validateSearch: validarSearchExplorar`.
  - `beca.$slug` solo valida los `utm_*`.
  - Los valores fuera de catálogo se descartan en `aFiltros(search, catalogos)`.
- **Push y replace.**
  - Push para cambiar de país y abrir una beca (`state: { desde }`).
  - Replace con `resetScroll: false` para los filtros; el texto con debounce de 250 ms.
- **UTM.** Se eliminan con replace después del primer pageview. `og:url` y `canonical` usan `SITE_URL` sin query.

## Δ§7 Globo
**Carga solo en cliente.**
- La caja se reserva solo con CSS (`hidden desk:block sticky`) y el círculo "Cargando globo…".
- `<ClientOnly fallback={<ReservaGlobo/>}>`, o `useEsCliente` si `ClientOnly` no existe.
- `const GlobeCanvas = import.meta.env.SSR ? null : lazy(() => import('./GlobeCanvas'))`.
- Las capacidades (WebGL, `saveData`, `deviceMemory`, reduced-motion) solo en `useEffect`.
- El botón móvil aparece tras hidratar, con la altura reservada.
- Materiales: se crean en el ciclo de vida del componente y se hace `dispose` en el cleanup (StrictMode los monta dos veces).

**Spike en un clon local del repo de Lovable, sin push.** Se añaden dos criterios:
- **S0 (bloqueante):** react-globe.gl 2.38.x con React 19.2.
  - `bun install` sin conflictos de peer;
  - 5 ciclos de montaje/desmontaje en StrictMode sin errores;
  - materiales válidos;
  - geometrías constantes.
- **S9:** `bun run build` en verde.
  - El bundle del servidor no evalúa three ni globe.
  - El HTML de `/` no contiene `<canvas>`.
  - 0 warnings de hidratación.

**Si falla S0:** `globe.gl` vanilla con ref en `GlobeCanvas.tsx` (`new Globe(el, {rendererConfig})`, métodos dentro de efectos, `_destructor()`; verificar las firmas).

## Δ Estilos (`src/styles.css`, sustituye el bloque CSS de VISUAL_DIRECTION §3)
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "@fontsource/newsreader/500.css";
@import "@fontsource/newsreader/600.css";
@import "@fontsource/ibm-plex-sans/400.css";
@import "@fontsource/ibm-plex-sans/500.css";
@import "@fontsource/ibm-plex-sans/600.css";

@custom-variant desk {
  @media (min-width: 1024px) and (pointer: fine) { @slot; }
}
/* borrar de la plantilla: @custom-variant dark y el bloque .dark */

:root {
  --paper:#F6F3EC; --surface:#FFFDF8; --ink:#1C1B18; --ink-2:#57534A; --muted-bg:#ECE7DC;
  --rule:#D6D0C2; --rule-strong:#1C1B18; --row-hover:#EFEAE0; --control:#7D776A;
  --signal:#0B6E4F; --signal-strong:#085A40; --signal-tint:#E3EFE8;
  --status-open-fg:#0B6E4F; --status-open-bg:#E3EFE8; --status-soon-fg:#8A5A00; --status-soon-bg:#F5E9CF;
  --status-rolling-fg:#0B6E4F; --status-rolling-bg:#E3EFE8; --status-pending-fg:#57534A; --status-pending-bg:#ECE7DC;
  --status-closed-fg:#57534A; --status-closed-bg:#ECE7DC;
  --error-fg:#A3261B; --error-bg:#F7E6E2; --overlay:rgba(28,27,24,0.40);
  --globe-bg:#F6F3EC; --globe-ocean:#E9E3D6; --globe-land:#CFC8B8; --globe-land-hover:#B8B09E;
  --globe-lit:#0B6E4F; --globe-lit-hover:#085A40; --globe-stroke:#F6F3EC; --globe-stroke-active:#1C1B18;
  --dur-fast:120ms; --dur-base:200ms; --dur-sheet-in:240ms; --dur-sheet-out:180ms; --dur-camera:900ms;
  --background:var(--paper); --foreground:var(--ink);
  --card:var(--surface); --card-foreground:var(--ink); --popover:var(--surface); --popover-foreground:var(--ink);
  --primary:var(--signal); --primary-foreground:var(--surface);
  --secondary:var(--muted-bg); --secondary-foreground:var(--ink);
  --muted:var(--muted-bg); --muted-foreground:var(--ink-2);
  --accent:var(--muted-bg); --accent-foreground:var(--ink);   /* hover NEUTRO: no es el acento de marca */
  --destructive:var(--error-fg); --destructive-foreground:var(--surface);
  --border:var(--rule); --input:var(--control); --ring:var(--ink); --radius:4px;
}

@theme { --color-*: initial; --shadow-*: initial; --radius-*: initial; }

@theme inline {
  --color-background:var(--background); --color-foreground:var(--foreground);
  --color-card:var(--card); --color-card-foreground:var(--card-foreground);
  --color-popover:var(--popover); --color-popover-foreground:var(--popover-foreground);
  --color-primary:var(--primary); --color-primary-foreground:var(--primary-foreground);
  --color-secondary:var(--secondary); --color-secondary-foreground:var(--secondary-foreground);
  --color-muted:var(--muted); --color-muted-foreground:var(--muted-foreground);
  --color-accent:var(--accent); --color-accent-foreground:var(--accent-foreground);
  --color-destructive:var(--destructive); --color-destructive-foreground:var(--destructive-foreground);
  --color-border:var(--border); --color-input:var(--input); --color-ring:var(--ring);
  --color-paper:var(--paper); --color-surface:var(--surface); --color-ink:var(--ink); --color-ink-2:var(--ink-2);
  --color-rule:var(--rule); --color-rule-strong:var(--rule-strong); --color-row-hover:var(--row-hover);
  --color-signal:var(--signal); --color-signal-strong:var(--signal-strong); --color-signal-tint:var(--signal-tint);
  --color-status-open-fg:var(--status-open-fg); --color-status-open-bg:var(--status-open-bg);
  --color-status-soon-fg:var(--status-soon-fg); --color-status-soon-bg:var(--status-soon-bg);
  --color-status-rolling-fg:var(--status-rolling-fg); --color-status-rolling-bg:var(--status-rolling-bg);
  --color-status-pending-fg:var(--status-pending-fg); --color-status-pending-bg:var(--status-pending-bg);
  --color-status-closed-fg:var(--status-closed-fg); --color-status-closed-bg:var(--status-closed-bg);
  --color-error-fg:var(--error-fg); --color-error-bg:var(--error-bg); --color-overlay:var(--overlay);
  --radius-xs:2px; --radius-sm:4px; --radius-md:4px; --radius-lg:4px; --radius-sheet:8px;
  --shadow-popover:0 4px 16px rgba(28,27,24,0.12);
  --shadow-overlay:0 -1px 0 rgba(28,27,24,0.08), 0 -8px 24px rgba(28,27,24,0.12);
}

@theme {
  --font-sans:"IBM Plex Sans","Segoe UI",system-ui,sans-serif;
  --font-serif:"Newsreader",Georgia,"Times New Roman",serif;
  --text-display:1.875rem; --text-display--line-height:2.25rem; --text-display--letter-spacing:-0.015em;
  --text-display-desk:2.5rem; --text-display-desk--line-height:2.75rem; --text-display-desk--letter-spacing:-0.015em;
  --text-h1:1.75rem; --text-h1--line-height:2.125rem; --text-h1--letter-spacing:-0.01em;
  --text-h1-desk:2.25rem; --text-h1-desk--line-height:2.625rem; --text-h1-desk--letter-spacing:-0.01em;
  --text-h2:1.375rem; --text-h2--line-height:1.75rem; --text-h2--letter-spacing:-0.005em;
  --text-h2-desk:1.5rem; --text-h2-desk--line-height:1.875rem; --text-h2-desk--letter-spacing:-0.005em;
  --text-h3:1.125rem; --text-h3--line-height:1.5rem;
  --text-body:1rem; --text-body--line-height:1.5rem;
  --text-body-sm:0.875rem; --text-body-sm--line-height:1.25rem;
  --text-meta:0.8125rem; --text-meta--line-height:1.125rem;
  --text-rubric:0.75rem; --text-rubric--line-height:1rem; --text-rubric--letter-spacing:0.08em;
  --text-num:0.9375rem; --text-num--line-height:1.25rem;
  --text-num-lg:1.5rem; --text-num-lg--line-height:1.875rem;
  --text-label:0.9375rem; --text-label--line-height:1.25rem;
  --ease-out:cubic-bezier(0.2,0,0,1); --ease-in:cubic-bezier(0.4,0,1,1); --ease-standard:cubic-bezier(0.2,0,0.2,1);
  --animate-pulso:pulso 1.4s ease-in-out infinite;
  @keyframes pulso { 50% { opacity: 0.55; } }
}

@utility num { font-variant-numeric: tabular-nums lining-nums; font-feature-settings: "tnum" 1, "lnum" 1; }

@layer base {
  html { background: var(--paper); color: var(--ink); }
  body { @apply bg-background text-foreground font-sans text-body; }
  :focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) {
    *,*::before,*::after { animation-duration:.01ms!important; animation-iteration-count:1!important;
      transition-duration:.01ms!important; scroll-behavior:auto!important; }
  }
}
```
**Preload de fuentes en el `head()` de `__root`:**
```ts
import n500 from '@fontsource/newsreader/files/newsreader-latin-500-normal.woff2?url';
import p400 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2?url';
// links: [{ rel:'stylesheet', href: appCss }, { rel:'preload', href:n500, as:'font', type:'font/woff2', crossOrigin:'anonymous' }, { rel:'preload', href:p400, as:'font', type:'font/woff2', crossOrigin:'anonymous' }]
```
- Las fuentes se cargan desde `styles.css`, porque el CSS importado desde JS puede no llegar al head en el SSR.
- Ajustes a los componentes de shadcn:
  - Popover, Select y Command: `shadow-popover`;
  - Sheet: `shadow-overlay`, `bg-overlay` y `rounded-t-sheet`;
  - Button, Input y Checkbox: sin `shadow-xs`.
- `tokens.ts` exporta `PAPEL` para `theme-color`.
- **Verificar en E1a:** que `transparent`/`current` siguen existiendo y que `desk:` va después de `sm:`.

## Δ§8 PostHog
- **Inicialización:** `initAnalytics()` y `usePageviews()` en el `useEffect` de `__root`, con `requestIdleCallback` y `import('posthog-js')`.
- **`track()`:**
  - no hace nada en el servidor;
  - encola hasta 50 eventos;
  - captura `$current_url: sanitizarUrl(location.href)` en el momento de la llamada;
  - en `$pageview`, además, `origenEntrada()` (UTM memoizados).
- **Pageviews:** `router.subscribe('onResolved')`, más el primer envío tras hidratar. La `plantilla` sale del routeId. `limpiarUtm()` se hace con replace después del primer pageview.
- **`scholarship_viewed.source`** sale de `origenEntrada()` y de `state.desde`.
- **`before_send`:**
  - quita `soy=` de todas las propiedades string que sean URL;
  - descarta strings de más de 200 caracteres;
  - en `filter_applied`, soy se envía como `definido` o `vacio`.
- **Errores del SSR:** son invisibles para PostHog, así que ErrorPagina emite `data_load_failed` en el cliente.

## Δ Dependencias (propuesta: eliminar las prohibidas)
| Paquete / archivo | Decisión |
|---|---|
| embla-carousel-react + carousel.tsx | eliminar (carruseles prohibidos) |
| sonner + sonner.tsx + `<Toaster/>` (+ next-themes si existe) | eliminar (toasts y modo oscuro prohibidos) |
| recharts + chart.tsx | eliminar |
| vaul + drawer.tsx | eliminar (se usa Sheet) |
| date-fns (+ react-day-picker/calendar.tsx) | eliminar; se mantiene Intl (zonas IANA) |
| card.tsx | eliminar |
| zod, tw-animate-css, cmdk, Radix | mantener |
| @tanstack/react-router-ssr-query | **añadir** (misma versión que el router) |

**Greps en cada `get_diff`** (se suman a los de §9):
- `embla-carousel|sonner|recharts|vaul|date-fns|react-day-picker|next-themes` → 0
- `components/ui/(card|carousel|chart|sonner|drawer|calendar)|<Toaster` → 0
- `createServerFn|createServerFileRoute|process\.env`
- `new QueryClient` fuera de `data/queryClient.ts`
- `\.dark|dark:`
- `shadow-(xs|sm|md|lg|xl|2xl)|rounded-(xl|2xl|3xl)|bg-(white|black)|text-white`
- lockfiles ajenos a bun
- cambios en `lovable-error-reporting.ts`

## Δ§9 Knowledge (sustituye al de PROJECT_BLUEPRINT §9)
```
becasu — reglas permanentes (no negociables)

PRODUCTO
Buscador de becas internacionales verificadas a mano. Promesa: "Becas abiertas hoy, verificadas en la fuente oficial." La veracidad está por encima de todo: nunca inventes becas, fechas, montos, instituciones ni textos de ejemplo en código de producción. Si falta un dato, muestra "Consultar convocatoria". UI en español neutro latinoamericano con tuteo, sin emojis. Usa literalmente el microcopy que te dé en cada mensaje.

STACK (base de Lovable; no la cambies ni actualices versiones)
TanStack Start (SSR) + TanStack Router por archivos en src/routes (routeTree.gen.ts es generado: no lo edites), React 19, TypeScript, Tailwind v4 (tokens solo en src/styles.css; no hay tailwind.config), shadcn/ui, tw-animate-css, lucide-react (strokeWidth 1.75), @tanstack/react-query, @tanstack/react-router-ssr-query, zod (solo en src/lib/url.ts), @supabase/supabase-js, @fontsource/newsreader, @fontsource/ibm-plex-sans. posthog-js y react-globe.gl solo cuando te lo pida. Gestor: bun. No añadas dependencias sin preguntar. No uses ni reinstales: embla-carousel, sonner, recharts, vaul, date-fns, react-day-picker, next-themes.
NO actives Lovable Cloud. NO uses la integración de Supabase de Lovable (tablas, migraciones, RLS, funciones, edge functions, SQL). El esquema lo mantiene otro equipo: si crees que falta un dato, dilo y detente.
Sin backend propio: prohibidos createServerFn, rutas de servidor o API, middlewares con lógica, process.env y cualquier secreto. El SSR solo renderiza y lee datos públicos.
No modifiques: supabase/, .github/, .project/, .claude/, public/geo/, scripts/, src/lib/lovable-error-reporting.ts.

SSR
- Nada de window, document, navigator, matchMedia, IntersectionObserver ni requestIdleCallback en el render ni a nivel de módulo: solo dentro de useEffect.
- Lo que depende de la hora o la zona del usuario ("En tu hora", "Plazo vencido") se muestra solo tras hidratar (useEsCliente). Cero avisos de hidratación en consola.
- QueryClient: uno por petición, creado dentro de la función de src/router.tsx; nunca a nivel de módulo.
- Loaders solo con context.queryClient.ensureQueryData(queryOptions de src/data) y solo en: beca.$slug (detalle + países), pais.$iso2 (países), como-verificamos (config). La lista de becas se pide en cliente; no la metas en loaders.
- Meta con head() en cada ruta: title, description, og:title, og:description, og:url y canonical (SITE_URL); noindex en 404 y en beca no encontrada. En meta y og nunca pongas estado, días restantes ni fechas de cierre: WhatsApp las guarda en caché.
- El globo solo en cliente: ClientOnly + import dinámico.

DATOS (Supabase, solo lectura)
- Cliente único en src/data/supabaseClient.ts con URL y publishable key (constantes públicas en src/lib/config.ts) y auth { persistSession:false, autoRefreshToken:false, detectSessionInUrl:false }. Nunca uses ni pidas claves service_role o secret.
- Solo lees: vistas becas_publicas y beca_detalle, y tablas pais, area, config. Siempre select con columnas explícitas (COLS_LISTA / COLS_DETALLE), nunca select('*'). Prohibido consultar beca, convocatoria, institucion, tablas N:M o paises_con_becas.
- estado y dias_restantes vienen de la vista: no los recalcules.
- Los componentes no importan el cliente: todo pasa por las queryOptions y hooks de src/data (en cliente, máx. 2 reintentos solo en errores transitorios; en servidor, 0 reintentos y timeout).
- Sin caché persistente: nada de datos en localStorage, sessionStorage ni IndexedDB.
- Filtrado, orden, agrupación y conteos SOLO con las funciones puras de src/lib/filtrarBecas.ts (compartidas por lista, país y globo). No dupliques lógica de filtros en componentes.

ESTRUCTURA
src/routes solo contiene archivos de ruta finos (validateSearch, beforeLoad, loader, head, component): __root.tsx, _explorar.tsx (layout sin path que mantiene el globo entre / y /pais), _explorar/index.tsx, _explorar/pais.$iso2.tsx, beca.$slug.tsx, como-verificamos.tsx. Páginas en src/paginas; además src/layouts, src/data, src/lib, src/search, src/globe (no importa src/data), src/analytics (único que importa posthog-js), src/ui (propios), src/components/ui (shadcn), src/dev/fixtures. No crees carpetas nuevas sin avisar.

ESTILO "Boletín en dos tintas"
- Colores solo con los tokens de src/styles.css (paper, surface, ink, ink-2, rule, rule-strong, row-hover, signal, signal-strong, signal-tint, status-*, error-*, overlay y los de shadcn). La paleta, las sombras y los radios por defecto de Tailwind están desactivados a propósito: no los reintroduzcas. Ningún HEX en componentes; las constantes del globo están en src/lib/tokens.ts.
- Verde (signal) SOLO para: estado Abierta y postulación continua, países iluminados del globo, botón primario y botones que llevan a becas abiertas. Enlaces de cuerpo en tinta subrayada. Selección en tinta. Urgencia en ocre (status-soon). Error en rojo ladrillo (error).
- Tipografía: Newsreader (font-serif; títulos 500/600) e IBM Plex Sans (font-sans; UI y cuerpo 400/500/600) desde @fontsource, importadas en src/styles.css. Utilidad num (tabular-nums) en fechas, conteos, días y montos. Escala: text-display, text-h1, text-h2, text-h3, text-body, text-body-sm, text-meta, text-rubric, text-num, text-num-lg, text-label (y -desk en display, h1, h2).
- Radios: rounded-sm (4 px) por defecto, rounded-xs (2 px) en chips, rounded-t-sheet (8 px) en Sheet. Separar con filetes (border-rule), nunca con sombras. Sombra solo shadow-popover (Popover, Select, Command) y shadow-overlay (Sheet).
- Becas en tablero: <ol> de <article> con filete inferior; columna de estado fija a la izquierda y columna de cierre a la derecha desde sm. Cada beca lleva nota de fuente ("Verificado el 12 sep 2026 · daad.de").
- Estados siempre con texto + icono (Circle relleno, Clock, RefreshCw, CircleDashed, Lock), nunca solo color.
- Fechas "15 dic 2026" (Intl es-CO, sin punto) solo con los helpers de src/lib/fechas.ts.
- Variante desk: = (min-width:1024px) and (pointer:fine). Móvil primero. El layout de escritorio se resuelve con CSS (desk:), no con JS durante el render.
- Motion solo funcional (tw-animate-css); respeta prefers-reduced-motion.

QUÉ NO UTILIZAR (nunca)
Gradientes; glassmorphism o blur; modo oscuro (ni .dark ni dark:); ámbar claro; verde en enlaces u hovers genéricos; Card de shadcn; rounded-xl, 2xl o 3xl; rounded-full salvo el punto de estado; sombras en filas, botones, inputs o secciones; hero + 3 tarjetas + CTA; carruseles; blobs; emojis; banderas; logos de instituciones; montos convertidos o estimados; Inter, Roboto o system como fuente principal; Google Fonts CDN; GSAP, Framer Motion, Lottie, three.js a mano; toasts para resultados o confirmaciones; gráficos; modales al entrar; scroll infinito; scroll anidado; en el globo: auto-rotación, atmósfera, estrellas, arcos, puntos, hexbins, texturas, zoom con rueda o captura del scroll.

ACCESIBILIDAD (WCAG 2.2 AA)
HTML semántico, html lang="es", un h1 por página, label visible en inputs, foco visible 2 px tinta + offset 2 px, objetivos ≥ 44 px en táctil, resumen de resultados en live region polite, role="alert" en errores, canvas del globo aria-hidden con el índice de países como equivalente. Enlaces externos con target="_blank" rel="noopener noreferrer" y "(se abre en una pestaña nueva)" en el nombre accesible.

URL
País en el path (/pais/$iso2, minúsculas; las mayúsculas redirigen). Filtros en la query en español: q, soy, nivel, area, cobertura, idioma, estado, cerradas (listas separadas por coma; cerradas=1). Validación y serialización solo en src/lib/url.ts (validateSearch del layout _explorar y parseSearch/stringifySearch del router). Cambiar país o abrir beca = push; filtros y texto = navigate con replace: true y resetScroll: false (texto con debounce de 250 ms). Estado efímero (desde, globo, visibles) en history state, nunca en la query.

ANALÍTICA Y PRIVACIDAD
Solo mediante track() de src/analytics (eventos tipados; en servidor no hace nada). Sin autocapture ni session replay. No envíes texto del buscador, nombres, correos ni el código de nacionalidad. No añadas otros servicios de terceros.

FORMA DE TRABAJAR
Haz solo lo que pide cada mensaje; no rediseñes lo ya aprobado. Si algo no está especificado, pregunta en vez de inventar. Datos ficticios solo en src/dev/fixtures (títulos con prefijo "[FICTICIA]", URLs https://example.org/...), cargados únicamente en cliente si import.meta.env.DEV y ?fixtures=1; nunca en producción.
```

## Δ Plan E0–E9 (solo cambios)
- **E0:** guardar el knowledge tras aprobar este delta y registrar las versiones exactas.
- **E1a** (dividir en E1a-1 estilos y dependencias, y E1a-2 rutas y router):
  - Contenido: `styles.css`, `__root` + `head()` + preload, `router.tsx`, 6 rutas vacías, `lib/url.ts`, `tokens.ts`, eliminación de dependencias, `Cache-Control`.
  - Aceptación:
    - `curl -sI /pais/DE` devuelve 301;
    - `<title>` y h1 en el HTML de `/como-verificamos`;
    - `Cache-Control: private, no-cache`;
    - 404 real;
    - 0 warnings de hidratación;
    - `desk:` activo a 1280 px con ratón e inactivo en tablet táctil;
    - los greps de dependencias en 0.
  - Medir la línea base del JS y del TTFB en el sitio publicado.
- **E1b:** `queryOptions`, `crearQueryClient`, integración SSR-Query, loader de `/beca` + `head()`.
  - En frío no hay fetch del cliente a `beca_detalle`.
  - La lista se pide solo desde el navegador.
  - Con Supabase inaccesible → ErrorPagina + `data_load_failed`.
- **E2.1:** tests con `bun test` (`bun:test`, `@types/bun`). Vitest solo si su peer admite Vite 8.
- **E4:** og de la ficha + prueba real con un enlace compartido por WhatsApp.
- **E5:** loader de países + `notFound`.
- **E6:** spike S0 + S9 en un clon local sin push; `ClientOnly` + guard SSR; la persistencia la da `_explorar`.
- **E7:** init en el efecto de `__root`, `onResolved`, `origenEntrada`, sanitización y `data_load_failed`.
- **E9:** el canvas no se recrea entre `/` y `/pais/de`.
- **Toma de `globe/` por `frontend`:** solo `bun install` (commitear `bun.lock`), sin tocar `routeTree.gen.ts`, `bun test src/lib`.

## Δ§11 Criterios de aceptación añadidos
13. 0 warnings de hidratación en `/`, `/pais/de` y `/beca/<slug>`, en móvil y en desk.
14. La vista previa de WhatsApp de una beca muestra título e institución reales, sin estado ni fecha.
15. HTML con `Cache-Control: private, no-cache`; 404 y 301 correctos; TTFB publicado medido y registrado como línea base.

## Riesgos nuevos
| # | Riesgo | Mitigación |
|---|---|---|
| N1 | nitro 3 beta | no actualizar; salida con `ssr:false` por ruta |
| N2 | runtime y región del SSR de Lovable sin verificar | medir TTFB; timeout de 3 s; `curl -sI`; presets de nitro portables |
| N3 | cambia el punto único de fallo | aceptar; ErrorPagina; la home no depende de Supabase para el HTML |
| N4 | React 19 + react-globe.gl | S0 bloqueante; plan B `globe.gl` vanilla |
| N5 | hidratación | `useEsCliente`; zona explícita; criterio 13 |
| N6 | QueryClient compartido | knowledge + grep |
| N7 | errores del SSR invisibles | `data_load_failed` desde ErrorPagina; revisar logs de Lovable en Fase 8 |
| N8 | búsqueda propia | tests de ida y vuelta; aceptación de E3 |
| N9 | Lovable reintroduce dependencias | knowledge + greps |
| N10 | WhatsApp cachea la vista previa | og sin estado ni fecha |
| N11 | bots disparan SSR | vigilar el uso de Supabase |
| N12 | +1-2 mensajes de Lovable | dividir E1a |

## Decisiones del usuario
1. Alcance del SSR:
   - (A) shell + `/beca` + `/pais` + `/como-verificamos`, con la lista en cliente (recomendada);
   - (B) también la lista;
   - (C) `ssr:false` global.
2. `SITE_URL` (subdominio de lovable.app o dominio propio) + og:image estática o solo texto.
3. Plan B del globo (`globe.gl` vanilla) preaprobado si S0 falla.
4. Eliminar dependencias prohibidas y añadir `@tanstack/react-router-ssr-query`.

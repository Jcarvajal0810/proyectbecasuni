# VISUAL DIRECTION — Fase 4 · 2026-09-29
Agente: design-director · Base: DESIGN_STRATEGY.md (aprobada), VALUE_REPORT.md · Dirección: híbrido A "Registro verificado" + B "Tablero de plazos" · Estado: **pendiente de aprobación**
Destino: brief para Lovable (React + TS + Tailwind + shadcn/ui). Si algo no está aquí, no se inventa: se consulta.

Verificaciones del PM (2026-09-29): `@fontsource/newsreader` 5.3.0 y `@fontsource/ibm-plex-sans` 5.3.0 existen en npm (OFL-1.1); `react-globe.gl` 2.38.0 (MIT). Contrastes de §3 recalculados de forma independiente: coinciden (globo iluminado/apagado = 3,75:1).

## 1. Concepto y firma memorable
**"Boletín en dos tintas".** La app se lee como un boletín público de convocatorias impreso en dos tintas sobre papel.
- **Tinta negra** para la información.
- **Verde registro** solo para lo que está abierto hoy.

El globo se imprime con las mismas dos tintas: océano color papel, tierra en tinta tenue y países con becas abiertas en verde plano. No hay espacio ni estrellas: parece un mapa de atlas, no un render.

Las becas no van en tarjetas. Van en un **tablero**: filas separadas por filetes, con una columna fija de estado a la izquierda y una columna de plazos con cifras tabulares a la derecha.

Cada beca termina con una **nota de fuente**: filete corto de 40 px y "Verificado el 12 sep 2026 · fuente oficial: daad.de", como una cita a pie de página.

**Firma:** globo-atlas en dos tintas + tablero de plazos + nota de fuente al pie de cada beca.

**Anti-generic check**
- **¿Podría ser de cualquier startup?** No. Serif editorial, papel cálido, filetes en vez de tarjetas y sombras, globo plano sin atmósfera.
- **¿Cambiando el logo sigue siendo la misma app?** Sí. Se reconoce por la nota de fuente, la columna de estado y el globo en dos tintas.
- **¿Cada decisión sirve al producto?** Sí:
  - serif y papel → registro verificado (el diferenciador es la veracidad);
  - cifras tabulares → comparar plazos;
  - un solo acento → "abierto hoy";
  - ocre → urgencia;
  - motion → solo orienta.
- **¿La estética perjudica la claridad?** No. Todo el texto está a ≥ 4,5:1 y ningún estado depende solo del color.

## 2. Tipografía
| Rol | Familia | Paquete | Pesos | Licencia |
|---|---|---|---|---|
| Títulos (display, h1, h2, título de beca) | **Newsreader** | `@fontsource/newsreader` | 500, 600 | OFL 1.1 |
| UI, cuerpo, cifras | **IBM Plex Sans** | `@fontsource/ibm-plex-sans` | 400, 500, 600 | OFL 1.1 |

**Carga**
- Imports en `main.tsx`: `@fontsource/newsreader/500.css`, `/600.css`, `@fontsource/ibm-plex-sans/400.css`, `/500.css`, `/600.css`.
- Los subsets se descargan por `unicode-range`, incluido latin-ext. `font-display: swap`.
- Precargar solo `newsreader-latin-500-normal.woff2` e `ibm-plex-sans-latin-400-normal.woff2`.
- Fuentes de respaldo: `"Newsreader", Georgia, "Times New Roman", serif` y `"IBM Plex Sans", "Segoe UI", system-ui, sans-serif`.
- Plan B si falla algo al instalar: Source Serif 4 + Public Sans (ambas OFL).

**Prohibido:** Inter, Roboto o system como display; una tercera familia; fonts.googleapis.com; monoespaciadas decorativas.

**Escala** (móvil → escritorio `desk`)
| Token | Familia/peso | Móvil | Escritorio | Tracking | Uso |
|---|---|---|---|---|---|
| display | Newsreader 500 | 30/36 | 40/44 | −0,015em | h1 de la home |
| h1 | Newsreader 500 | 28/34 | 36/42 | −0,01em | h1 de país y de beca |
| h2 | Newsreader 500 | 22/28 | 24/30 | −0,005em | secciones |
| h3 | Newsreader 600 | 18/24 | 18/24 | 0 | título de beca en la fila |
| body | Plex 400 | 16/24 | = | 0 | texto; inputs ≥ 16 |
| body-sm | Plex 400 | 14/20 | = | 0 | metadatos de la fila |
| meta | Plex 400/500 | 13/18 | = | 0 | nota de fuente, "quedan X días"; tamaño mínimo |
| rubric | Plex 600 MAYÚS | 12/16 | = | +0,08em | solo encabezados de columna del tablero |
| num | Plex 500 tnum | 15/20 | = | 0 | fecha de cierre en la fila |
| num-lg | Plex 600 tnum | 24/30 | = | 0 | bloque de cierre de la ficha |
| label/botón | Plex 500 | 15/20 | = | 0 | botones, filtros |

**Cifras**
- Clase `.num { font-variant-numeric: tabular-nums lining-nums; font-feature-settings: "tnum" 1, "lnum" 1; }`.
- Es obligatoria en fechas, "quedan X días", contador, conteos de filtros, montos y "Mostrar 20 más (quedan 43)".
- Las cifras alineadas van siempre en Plex, nunca en Newsreader.
- Al instalar, comprobar que `tnum` cambia el ancho de "1111" frente a "0000".

## 3. Color
**Principio:** papel, tinta y un único acento de señal (verde registro).

**Usos permitidos del verde:**
- estados Abierta y Postulación continua;
- países iluminados en el globo;
- botón primario (sobre todo "Ir a la convocatoria oficial");
- botones que llevan a becas abiertas ("Ver 23 becas").

**Nada más.** La selección se marca en **tinta**, la urgencia en **ocre oscuro** y el error en **rojo ladrillo**.

**Base**
| Token | HEX | HSL | Uso |
|---|---|---|---|
| `--paper` / `--background` | #F6F3EC | 42 35.7% 94.5% | fondo de página y del globo |
| `--surface` / `--card` / `--popover` | #FFFDF8 | 43 100% 98.6% | Sheet, popover, inputs, bloque de ficha |
| `--ink` / `--foreground` | #1C1B18 | 45 7.7% 10.2% | texto, filete de sección, foco, selección |
| `--ink-2` / `--muted-foreground` | #57534A | 42 8.1% 31.6% | metadatos, nota de fuente, por confirmar/cerrada |
| `--muted` / `--secondary` / `--accent` (neutro shadcn) | #ECE7DC | 41 29.6% 89.4% | esqueletos, hover secundario, fondos pendiente/cerrada |
| `--row-hover` | #EFEAE0 | 40 31.9% 90.8% | hover de fila |
| `--rule` / `--border` | #D6D0C2 | 42 19.6% 80% | filetes decorativos |
| `--input` | #7D776A | 41 8.2% 45.3% | borde de inputs, chips y checkbox |
| `--rule-strong` | #1C1B18 | = tinta | filete que abre cada sección |
| `--signal` / `--primary` | #0B6E4F | 161 81.8% 23.7% | acento único |
| `--signal-strong` | #085A40 | 161 83.7% 19.2% | hover/activo del primario; hover de país iluminado |
| `--signal-tint` | #E3EFE8 | 145 27.3% 91.4% | bloque abierto en la ficha; dominio en el CTA |
| `--primary-foreground` | #FFFDF8 | 43 100% 98.6% | texto sobre el primario |
| `--destructive` / `--error-fg` | #A3261B | 5 71.6% 37.3% | error |
| `--error-bg` | #F7E6E2 | 11 56.8% 92.7% | bloque de error |
| `--ring` | #1C1B18 | = tinta | anillo de foco 2 px + offset 2 px |
| `--overlay` | rgba(28,27,24,0.40) | | velo |

**Estados**
- Las insignias van sin fondo ni borde: icono de 16 px + texto `meta` 600 en el color del estado.
- El fondo solo se usa en el bloque de estado de la ficha.

| Estado | Texto / icono | Fondo (solo ficha) |
|---|---|---|
| open (Abierta) | #0B6E4F | #E3EFE8 |
| soon (Cierra pronto / hoy) | #8A5A00 (nunca ámbar claro) | #F5E9CF |
| rolling (Postulación continua) | #0B6E4F | #E3EFE8 |
| pending (Por confirmar) | #57534A | #ECE7DC |
| closed (Cerrada) | #57534A (título de la fila también en ink-2) | #ECE7DC |

**Globo** (constantes JS en `src/lib/tokens.ts`, reflejadas como `--globe-*`)
| Token | HEX | Uso |
|---|---|---|
| bg | #F6F3EC | fondo del canvas |
| ocean | #E9E3D6 | esfera |
| land | #CFC8B8 | país apagado |
| land-hover | #B8B09E | hover sobre país apagado |
| lit | #0B6E4F | país con becas abiertas (único tono) |
| lit-hover | #085A40 | hover o selección de país iluminado |
| stroke | #F6F3EC | límites entre países |
| stroke-active | #1C1B18 | trazo en hover o selección |

**Contrastes** (WCAG 2.x, verificados por el PM)
| Par | Ratio | Mín. |
|---|---|---|
| tinta / papel | 15,54 | 4,5 |
| tinta / superficie | 16,94 | 4,5 |
| tinta-2 / papel | 6,91 | 4,5 |
| tinta-2 / apagado | 6,21 | 4,5 |
| señal / papel | 5,64 | 4,5 |
| señal / hover de fila | 5,22 | 4,5 |
| señal / tinte | 5,30 | 4,5 |
| superficie / señal (texto del botón) | 6,15 | 4,5 |
| tinte / señal (dominio en el CTA) | 5,30 | 4,5 |
| superficie / señal fuerte | 8,11 | 4,5 |
| ocre / papel | 5,35 | 4,5 |
| ocre / tinte ocre | 4,92 | 4,5 |
| ocre / hover de fila | 4,94 | 4,5 |
| ocre / apagado | 4,81 | 4,5 |
| error / papel | 6,65 | 4,5 |
| error / fondo de error | 6,09 | 4,5 |
| superficie / tinta (chip seleccionado) | 16,94 | 4,5 |
| borde de control / papel | 4,02 | 3 |
| borde de control / superficie | 4,38 | 3 |
| **globo iluminado / apagado** | **3,75** | 3 ✓ |
| globo iluminado / océano | 4,89 | 3 ✓ |
| globo iluminado-hover / apagado | 4,95 | 3 ✓ |
| trazo tinta / iluminado | 2,75 | ✗ → la selección se comunica también por texto (h1 u hoja) |
| filete / papel, tierra / océano, océano / fondo | decorativos | — |
| muestra de tierra en la leyenda | con borde #7D776A (4,02) | — |

**Tokens CSS** (`src/index.css`; shadcn con Tailwind v3 y canales HSL. En Tailwind v4 o con oklch, usar los HEX literales.)
```css
@layer base {
  :root {
    --background: 42 35.7% 94.5%;
    --foreground: 45 7.7% 10.2%;
    --card: 43 100% 98.6%;
    --card-foreground: 45 7.7% 10.2%;
    --popover: 43 100% 98.6%;
    --popover-foreground: 45 7.7% 10.2%;
    --primary: 161 81.8% 23.7%;        /* señal: ÚNICO acento */
    --primary-foreground: 43 100% 98.6%;
    --secondary: 41 29.6% 89.4%;
    --secondary-foreground: 45 7.7% 10.2%;
    --muted: 41 29.6% 89.4%;
    --muted-foreground: 42 8.1% 31.6%;
    --accent: 41 29.6% 89.4%;          /* hover NEUTRO shadcn — NO es el acento de marca */
    --accent-foreground: 45 7.7% 10.2%;
    --destructive: 5 71.6% 37.3%;
    --destructive-foreground: 43 100% 98.6%;
    --border: 42 19.6% 80%;
    --input: 41 8.2% 45.3%;
    --ring: 45 7.7% 10.2%;
    --radius: 0.25rem;

    --paper:#F6F3EC; --surface:#FFFDF8; --ink:#1C1B18; --ink-2:#57534A;
    --rule:#D6D0C2; --rule-strong:#1C1B18; --row-hover:#EFEAE0;
    --signal:#0B6E4F; --signal-strong:#085A40; --signal-tint:#E3EFE8;
    --status-open-fg:#0B6E4F; --status-open-icon:#0B6E4F; --status-open-bg:#E3EFE8;
    --status-soon-fg:#8A5A00; --status-soon-icon:#8A5A00; --status-soon-bg:#F5E9CF;
    --status-rolling-fg:#0B6E4F; --status-rolling-icon:#0B6E4F; --status-rolling-bg:#E3EFE8;
    --status-pending-fg:#57534A; --status-pending-icon:#57534A; --status-pending-bg:#ECE7DC;
    --status-closed-fg:#57534A; --status-closed-icon:#57534A; --status-closed-bg:#ECE7DC;
    --error-fg:#A3261B; --error-bg:#F7E6E2;
    --globe-bg:#F6F3EC; --globe-ocean:#E9E3D6; --globe-land:#CFC8B8; --globe-land-hover:#B8B09E;
    --globe-lit:#0B6E4F; --globe-lit-hover:#085A40; --globe-stroke:#F6F3EC; --globe-stroke-active:#1C1B18;
    --overlay: rgba(28,27,24,0.40);
    --shadow-overlay: 0 -1px 0 rgba(28,27,24,0.08), 0 -8px 24px rgba(28,27,24,0.12);
    --shadow-popover: 0 4px 16px rgba(28,27,24,0.12);
    --dur-fast:120ms; --dur-base:200ms; --dur-sheet-in:240ms; --dur-sheet-out:180ms; --dur-camera:900ms;
    --ease-out:cubic-bezier(0.2,0,0,1); --ease-in:cubic-bezier(0.4,0,1,1); --ease-standard:cubic-bezier(0.2,0,0.2,1);
  }
}
```
**Tailwind `theme.extend`**
- `colors`: paper, surface, ink, ink-2, rule, row-hover, signal, signal-strong, signal-tint, status.{open,soon,rolling,pending,closed}.{fg,icon,bg}, error.{fg,bg}.
- `fontFamily`: serif = Newsreader, sans = IBM Plex Sans (por defecto; se quita Inter).
- `fontSize`: los tokens de §2.
- `screens.desk`: `{ raw: '(min-width: 1024px) and (pointer: fine)' }`.
- Sin `.dark`.

## 4. Espaciado, grid y layout
**Espaciado**
- Base de 4 px. Valores permitidos: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 y 80 px.
- Fila del tablero: padding vertical de 16 px, 4 px entre líneas.
- Entre secciones: 48 px (40 en móvil).
- Del filete de sección al h2: 12 px.

**Breakpoints**
| Nombre | Condición | Qué cambia |
|---|---|---|
| base | < 640 | una columna; fila en 2 columnas |
| `sm` | ≥ 640 | fila en 3 columnas (se añade el cierre) |
| `md` | ≥ 768 | márgenes de 24 |
| `desk` | ≥ 1024 **y** puntero fino | dos columnas |
| `xl` | ≥ 1280 | solo crece el globo |

Una tablet táctil se trata como móvil, con el globo bajo demanda.

**Grids**
| Contexto | Columnas | Márgenes | Gutter | Máximo |
|---|---|---|---|---|
| Móvil | 4 | 16 | 16 | — |
| Tablet | 8 | 24 | 24 | — |
| Escritorio | 12 | 32 | 24 | 1440 |

**Home y página de país en `desk`**
- `grid-template-columns: minmax(360px,1fr) minmax(560px,680px); column-gap: 40px`.
- Globo `sticky; top:24px; height: calc(100dvh - 48px)`.
- Resultados con el scroll normal de la página. Sin scroll anidado ni scroll-trap.

**Anchos de lectura:** prosa 68ch, columna principal de la ficha 680 px, aside 300 px.

**Home móvil (en orden)**
1. "Saltar a los resultados" (visible al recibir foco).
2. Encabezado de 56 px, estático: wordmark en Newsreader 600 20 px + "Cómo verificamos" + filete.
3. Bloque de apertura:
   - h1 display "Becas abiertas hoy, verificadas en la fuente oficial.";
   - contador `.num` "Hoy: 37 becas abiertas en 14 países";
   - nota de catálogo (filete de 40 px + `meta` "Catálogo verificado a mano · última verificación 26 sep 2026").
4. Buscador con label visible "Buscar becas", input de 48 px y icono Search.
5. Acciones: select "Soy de", "Filtros (2)" (abre Sheet) y "Explorar en el globo" (secundario, icono Globe; abre el globo a pantalla completa).
6. Resumen en live region polite: "23 becas coinciden · ordenadas por fecha de cierre".
7. "Cierran en los próximos 30 días": filete fuerte + h2 + filas.
8. "Con fecha de cierre".
9. "Abiertas · postulación continua".
10. "Mostrar 20 más (quedan 43)".
11. Plegable "Por confirmar (5)".
12. "Ver también las cerradas (12)".
13. Índice "Países con becas abiertas": nombre + conteo `.num` a la derecha, en 2 columnas, cada uno enlazado a `/pais/:iso2`.
14. Pie: "Cómo verificamos · Reportar un error · Datos verificados manualmente; confirma siempre en la fuente oficial."

**Home `desk`**
- Encabezado de 64 px.
- Columna izquierda (sticky):
  - el globo;
  - la leyenda, abajo a la izquierda;
  - zoom +/−, abajo a la derecha;
  - debajo, un plegable "Lista de países (14)" con el índice (que no se repite a la derecha).
- Columna derecha:
  - bloques 3 y 4;
  - filtros en línea: "Soy de", Nivel, Área, Cobertura y Estado como Popovers con checkboxes, más "Limpiar filtros";
  - encabezado `rubric` "Estado · Beca · Cierre" con filete fuerte (`aria-hidden`);
  - bloques 6 a 12.

**/pais/:iso2**
- **`desk`:** mismo esqueleto que la home. El globo persiste, centrado en el país. Columna derecha:
  - "← Todas las becas" (conserva la query);
  - h1 "Alemania";
  - `.num` "6 becas abiertas · 2 por confirmar";
  - filtros, tablero, por confirmar y cerradas.
- **Móvil:** sin globo. El mismo orden, con "Explorar en el globo" bajo el h1.
- **País con 0 abiertas:**
  - "Hoy no hay becas abiertas con destino en Alemania.";
  - "Próximas aperturas con fecha oficial";
  - "Por confirmar" desplegado;
  - "Ver todas las becas abiertas".

**/beca/:slug** (sin globo)
- **Móvil, en orden:**
  1. Encabezado.
  2. "← Volver a los resultados" o "← Todas las becas".
  3. Estado.
  4. h1.
  5. Oferente en ink-2.
  6. **Bloque de cierre**:
     - superficie, borde `--rule`, radio 4, padding 16; fondo de estado si está abierta o cierra pronto;
     - rubric "Cierre";
     - `num-lg` "15 dic 2026, 23:59";
     - `meta` "hora de Berlín (Europe/Berlin)";
     - `body-sm` "En tu hora: 15 dic 2026, 17:59 (America/Bogota)";
     - "Quedan 12 días" (ocre 600 si faltan ≤ 30 días);
     - aviso si no hay zona horaria.
  7. **CTA oficial**.
  8. **Nota de fuente**.
  9. "Datos clave" como `<dl>` en 2 columnas (etiqueta de 128 px ink-2 / valor en tinta), con filetes:
     - Destino, Nivel, Áreas, Cobertura;
     - Monto: solo oficial, "EUR 934 al mes" con `monto_periodo`, sin conversión;
     - Nacionalidades elegibles, o "Consultar convocatoria";
     - Idioma: `idiomas_requeridos` + certificación;
     - Requisito previo.
  10. "Requisitos clave" (68ch).
  11. "Próxima convocatoria".
  12. Acciones: "Compartir por WhatsApp", "Copiar enlace", "¿Viste un dato incorrecto? Repórtalo".
  13. Si está cerrada: "Becas similares abiertas" (3 filas).
  14. Pie.
- **`desk`:** `grid-template-columns: minmax(0,680px) 300px; gap: 48px`.
  - Columna principal: bloques 2, 3, 4, 5, 9, 10, 11, 12 y 13.
  - Aside sticky: bloques 6, 7 y 8 (la acción junto a la confianza).

## 5. Forma y componentes
**Radios**
- 4 px: botones, inputs, bloque de cierre, leyenda, popover.
- 2 px: chips, tooltip del globo.
- Sheet: 8 px, solo arriba.
- `rounded-full`: solo el punto de estado y los radios de formulario.

**Bordes y sombras**
- Separar con **filetes**, nunca con sombra.
- Sombra solo en capas superpuestas: `--shadow-overlay` en Sheet y hoja inferior; `--shadow-popover` + borde de 1 px en Popover, Select y Command.
- Prohibido `shadow-*` en filas, secciones, botones e inputs.
- **Sin `Card` para las becas.**

**Fila de beca**
- `<article>` dentro de un `<ol>`, con filete inferior `--rule`.
- Grid: base `24px 1fr`; `sm` `24px 1fr 128px`. Gap de 12, y 16 antes de la columna de cierre.
- **Columna 1:** icono de estado de 16 px, siempre en la misma X.
- **Columna 2:**
  1. Estado en `meta` 600, en su color.
  2. Título `h3` en Newsreader: enlace a `/beca/:slug` con `::after` que cubre toda la fila. Sin subrayado, salvo en hover.
  3. `body-sm` ink-2: "DAAD · Alemania" ("Alemania, Austria y 2 más").
  4. `body-sm` ink-2: "Maestría · Cobertura total".
  5. Solo en base: `num` "Cierra 15 dic 2026 · quedan 12 días".
  6. Nota compacta `meta` "Verificado 12 sep 2026 · daad.de". Si es antigua: History 14 + "Verificado hace más de 4 meses · confirma en la fuente oficial".
- **Columna 3** (desde `sm`, alineada a la derecha):
  - `num` "15 dic 2026" y, debajo, "quedan 12 días" (500 ink-2; 600 ocre si faltan ≤ 30 días);
  - otros casos:
    - "Cierra hoy · menos de 24 h" (ocre 600);
    - "Continua";
    - "Sin fecha oficial";
    - "Cerró 30 jun 2026";
    - "Plazo vencido · actualizando".
- Hover: fondo `--row-hover` + título subrayado.
- Foco: anillo en toda la fila.

**Insignia de estado**
- Icono de 16 px + texto. Sin fondo, sin borde, sin forma de pastilla.
- El icono va `aria-hidden`.

**Sello (nota de fuente)**
1. Filete de 40×1 en ink-2, con 8 px debajo.
2. `meta` "Verificado el **12 sep 2026** · fuente oficial: **daad.de**", con fecha y dominio en 500 tinta `.num`.
3. Enlace "Cómo verificamos".
4. Si es antigua: History + "Verificado hace más de 4 meses: confirma los datos en la fuente oficial."

La versión compacta de la fila es solo la línea 2.

**CTA "Ir a la convocatoria oficial"**
- `<a target="_blank" rel="noopener noreferrer">`, mínimo 56 px de alto, a todo el ancho en móvil y en el aside.
- Padding 12/16, radio 4, fondo `--signal` (hover `--signal-strong`).
- Contenido:
  - línea 1: Plex 500 15 px "Ir a la convocatoria oficial";
  - línea 2: `meta` en `--signal-tint` con el dominio;
  - ArrowUpRight 20 a la derecha.
- Nombre accesible: "Ir a la convocatoria oficial en daad.de (se abre en una pestaña nueva)".
- Si está cerrada: botón secundario "Ver la convocatoria oficial (cerrada)".

**Botones**
- **Primario:** 44 px de alto en móvil y 40 en `desk`, fondo señal.
- **Secundario:** transparente, borde de 1 px tinta; hover `--muted`.
- **Enlaces de cuerpo:** tinta subrayada (1 px, offset 3), **no verdes**.
- **Deshabilitado:** borde `--rule`, texto #7D776A.

**Chips y filtros**
- 36 px en `desk`, 44 en táctil; radio 2; borde `--input`; fondo superficie; Plex 500 14; conteo `.num` "Maestría (12)".
- Seleccionado: fondo tinta, texto superficie e icono Check.
- Checkbox marcado en tinta.
- Máximo 6 chips visibles.

**Sheet de filtros (móvil)**
- Abre desde abajo, 92dvh, superficie, radio superior 8, velo.
- Cabecera de 56 px: h2 "Filtros" + "Limpiar" + X de 44.
- Un `fieldset`/`legend` por grupo, separados por filetes.
- Pie sticky con primario de 48 px "Ver 23 becas" (conteo en vivo).
- Al cerrar, el foco vuelve a "Filtros".

**Hoja inferior de país (globo móvil)**
- Sheet desde abajo, alto automático, sin velo, con el foco gestionado.
- Contenido:
  - h2 "Alemania";
  - "6 becas abiertas · 2 por confirmar";
  - primario "Ver becas en Alemania";
  - "¿Buscabas…?" con 2-3 países vecinos (≥ 44 px);
  - X.
- Con 0 abiertas: "Hoy no hay becas abiertas con destino en Francia." + "Ver próximas aperturas".

**Globo a pantalla completa (móvil)**
- Capa fija sobre papel.
- Barra de 56 px: "Explorar por país" + "Cerrar globo".
- Leyenda abajo.
- Los gestos solo se capturan en este modo.

**Plegable "Por confirmar"**
- Disparador de ≥ 48 px con filete superior: CircleDashed + "Por confirmar (5)" + `meta` "Sin fecha oficial publicada o con verificación antigua" + ChevronDown que rota.
- `aria-expanded`. Plegado por defecto.

**Contador**
- "Hoy: **37** becas abiertas en **14** países" (cifras en 600 `.num`), con sus singulares.
- Con 0: "Hoy no hay becas abiertas. Estas son las próximas aperturas con fecha oficial."

**Estados**
- **Cargando:**
  - 5 filas esqueleto con la misma anatomía, `aria-busy`;
  - "Cargando becas…";
  - el globo reserva su caja: círculo con borde `--rule` + "Cargando globo…";
  - sin spinners.
- **Vacío:**
  - h2 "Ninguna beca coincide con estos filtros";
  - sugerencias con conteo ("Quitar «Doctorado» → 4 becas");
  - "Limpiar todos los filtros".
- **Error:**
  - bloque `role="alert"`: fondo `--error-bg`, borde `--error-fg`, radio 4, padding 16;
  - CircleAlert + "No pudimos cargar las becas." + "Revisa tu conexión e inténtalo de nuevo." + "Reintentar" (RotateCcw).
- **Parcial:** "Consultar convocatoria" en ink-2.
- **Fallback del globo:**
  - "El globo no está disponible en este dispositivo. Usa la lista de países.";
  - dispositivo débil o `saveData`: "Cargar globo" + "Usa más datos y batería; la lista tiene la misma información.";
  - reduced-motion: "Mostrar globo (sin animaciones)".
- **No encontrada:** h1 "No encontramos esta beca" + "Puede que el enlace esté mal escrito o que la hayamos retirado del catálogo." + buscador.

## 6. Iconografía
- `lucide-react`, `strokeWidth={1.75}`.
- Tamaños: 16 junto a texto de 13-15 px; 20 en botones; 14 en la nota de fuente.
- Siempre `aria-hidden` junto a texto. Sin iconos decorativos en los metadatos.

| Uso | Icono |
|---|---|
| Abierta | `Circle` fill currentColor, 12 px en caja de 16 |
| Cierra pronto / hoy | `Clock` |
| Postulación continua | `RefreshCw` |
| Por confirmar | `CircleDashed` |
| Cerrada | `Lock` |
| Verificación antigua | `History` |
| Externo | `ArrowUpRight` |
| Buscar | `Search` |
| Filtros | `SlidersHorizontal` |
| Globo | `Globe` |
| Cerrar | `X` |
| Volver | `ArrowLeft` |
| Plegable | `ChevronDown` |
| Seleccionado | `Check` |
| Copiar | `Link2` |
| Compartir | `Share2` (WhatsApp como texto, sin logo) |
| Reportar | `Flag` |
| Error | `CircleAlert` (o `AlertCircle` en versiones antiguas) |
| Reintentar | `RotateCcw` |
| Zoom | `Plus` / `Minus` |

Sin banderas, emojis ni logos de instituciones.

## 7. Globo (react-globe.gl, chunk lazy)
**Configuración base**
- `backgroundColor="#F6F3EC"`, `showAtmosphere={false}`, `showGraticules={false}`.
- Sin imágenes de globo, relieve ni fondo.
- `globeMaterial = new MeshBasicMaterial({ color: '#E9E3D6' })`, memoizado.
- Polígonos: GeoJSON de Natural Earth. La resolución la deciden `frontend`/`architect`; hay que mapear ISO_A2 = −99 usando ISO_A2_EH o ADM0_A3.
- `polygonsData` y altitud base memoizados (condición de architect para R9).
- `MeshBasicMaterial` por estado vía `polygonCapMaterial` y `polygonSideMaterial`, con color plano. Así el contraste calculado es el real.

| Estado | Cap | Side | Trazo | Altitud |
|---|---|---|---|---|
| Apagado | #CFC8B8 | #B8B09E | #F6F3EC | 0,004 |
| Iluminado | #0B6E4F | #085A40 | #F6F3EC | 0,008 |
| Hover apagado | #B8B09E | #B8B09E | #1C1B18 | 0,018 |
| Hover iluminado | #085A40 | #085A40 | #1C1B18 | 0,018 |
| Seleccionado | su hover | | #1C1B18 | 0,024 |

**Render y cámara**
- La selección se refuerza siempre con texto (h1 u hoja).
- `polygonsTransitionDuration = 200` (0 con reduced-motion).
- `rendererConfig = { antialias: true, alpha: false, powerPreference: 'low-power' }`.
- Pixel ratio: `min(dpr, 2)` en `desk` y `min(dpr, 1.5)` en móvil.
- Vista inicial sobre el Atlántico: `pointOfView({ lat: 20, lng: -35, altitude: 2.2 })` (2,6 en móvil a pantalla completa).

**Controles**
- `autoRotate=false`, `enablePan=false`.
- `enableZoom=false` en `desk`: la rueda no hace zoom y no atrapa el scroll.
- Botones +/− de 32 px (44 en táctil), altitud 1,4-3,2, pasos de 0,4.
- Pinch solo en pantalla completa móvil.
- Damping 0,1 (off con reduced-motion).

**Hover**
- Cursor pointer.
- Tooltip HTML: superficie, borde tinta, radio 2, padding 6×8, Plex 13 `.num`, sin sombra.
- Texto: "Alemania: 6 becas abiertas" / "Francia: sin becas abiertas hoy".
- Retardo de 100 ms, sin fundido.

**Clic**
- `desk`: `pointOfView({lat,lng,altitude:1.8}, 900)` → `/pais/:iso2` → foco en el h1.
- Móvil: centrar y abrir la hoja.

**Filtros (R9, aprobado con condiciones):** los colores reflejan los filtros activos. Un solo tono; la leyenda añade "Según tus filtros"; solo cuentan becas abiertas.

**Accesibilidad:** canvas `aria-hidden`, fuera del orden de tabulación. El índice de países es el equivalente.

**Leyenda**
- HTML abajo a la izquierda: fondo papel, borde `--rule`, radio 4, padding 8×12, `meta`.
- Muestra verde 12×12 "Con becas abiertas hoy".
- Muestra #CFC8B8 con borde #7D776A "Sin becas abiertas hoy".

**Prohibido:** atmósfera, estrellas o fondo negro; texturas; arcos, puntos, hexbins o pulsos; coropletas por conteo; etiquetas 3D; bloom; auto-rotación; zoom con rueda; captura de scroll; banderas.

## 8. Motion
**Global**
- `@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; scroll-behavior:auto!important } }`.
- Hook `useReducedMotion()` para el globo.

| Qué | Duración | Easing | Reduced-motion |
|---|---|---|---|
| Cámara al centrar país | 900 ms | interno | 0 |
| Color/altitud de país | 200 ms | interno | 0 |
| Hover de fila | 120 ms | ease-out | instantáneo |
| Sheet: entrada | 240 ms | cubic-bezier(0.2,0,0,1) | instantáneo |
| Sheet: salida | 180 ms | cubic-bezier(0.4,0,1,1) | instantáneo |
| Velo | 180 ms opacidad | lineal | instantáneo |
| Dialog/Popover | 150 ms opacidad + 4 px | ease-out | instantáneo |
| Plegable + chevron | 200 ms | ease-standard | instantáneo |
| Esqueleto | 1,4 s pulso 1→0,55 | ease-in-out | estático |
| Tooltip del globo | retardo 100 ms | — | igual |
| Scroll al navegar | `auto` | — | igual |

**No se anima:** auto-rotación, contadores, parallax, scroll-jacking, listas escalonadas, transiciones de página, hover con escala. Sin GSAP, Framer, Lottie ni three.js a mano; basta `tailwindcss-animate`.

## 9. Microcopy clave
Español neutro latinoamericano, con tuteo.

**Formato de fecha:** "15 dic 2026". Usa `Intl.DateTimeFormat('es-CO',{day:'numeric',month:'short',year:'numeric'})` y `formatToParts`, quitando el punto de "dic.".

**Home**
- h1: "Becas abiertas hoy, verificadas en la fuente oficial."
- Contador: "Hoy: 37 becas abiertas en 14 países" / "Hoy: 1 beca abierta en 1 país".
- Catálogo: "Catálogo verificado a mano · última verificación 26 sep 2026".

**Buscador y filtros**
- Buscador: label "Buscar becas", placeholder "Beca, institución o país".
- "Soy de": "Cualquier nacionalidad". Nota: "Incluimos becas sin dato de nacionalidad, marcadas como «Consultar convocatoria»".
- Botones: "Filtros (2)", "Limpiar filtros", "Explorar en el globo", "Cerrar globo".
- Resumen: "23 becas coinciden · ordenadas por fecha de cierre".

**Secciones:** "Cierran en los próximos 30 días", "Con fecha de cierre", "Abiertas · postulación continua", "Por confirmar (5)", "Cerradas (12)", "Próximas aperturas con fecha oficial".

**Estados y plazos**
- Insignias: "Abierta", "Cierra pronto", "Cierra hoy", "Abierta · postulación continua", "Por confirmar", "Cerrada".
- Plazos: "Cierra 15 dic 2026 · quedan 12 días", "queda 1 día", "Cierra hoy · menos de 24 h", "Cerró 30 jun 2026", "Sin fecha oficial", "Plazo vencido · actualizando".

**Ficha**
- CTA: "Ir a la convocatoria oficial" + dominio. Si está cerrada: "Ver la convocatoria oficial (cerrada)".
- Sello: "Verificado el 12 sep 2026 · fuente oficial: daad.de · Cómo verificamos". Si es antiguo: "Verificado hace más de 4 meses: confirma los datos en la fuente oficial."
- Zona horaria:
  - "hora de Londres (Europe/London)";
  - "En tu hora: …";
  - sin zona: **"La fuente no indica zona horaria; mostramos el cierre más temprano posible."** (corregido por el PM para alinearlo con DESIGN_STRATEGY 3 y con `deadline_fin_del_dia`).
- Cerrada: "Esta convocatoria cerró el 30 jun 2026." + "Próxima convocatoria: se abre en oct 2026 según daad.de" + "Becas similares abiertas".
- Reporte: "¿Viste un dato incorrecto? Repórtalo" (enlace a Google Forms con el slug prellenado).
- Compartir: "Compartir por WhatsApp", "Copiar enlace". Confirmación en línea "Enlace copiado", sin toast.

**País**
- "6 becas abiertas · 2 por confirmar".
- "Hoy no hay becas abiertas con destino en Alemania."
- "¿Buscabas…?"
- "Ver becas en Alemania".

**Leyenda:** "Con becas abiertas hoy" / "Sin becas abiertas hoy" (+ "Según tus filtros").

**Temporada baja:** "Hoy no hay becas abiertas. Estas son las próximas aperturas con fecha oficial."

**Vacío y error**
- Vacío: "Ninguna beca coincide con estos filtros", "Quitar «Doctorado» → 4 becas", "Limpiar todos los filtros".
- Error: "No pudimos cargar las becas.", "Revisa tu conexión e inténtalo de nuevo.", "Reintentar".

**Carga y paginación**
- Carga: "Cargando becas…", "Cargando globo…", "Cargar globo", "Mostrar globo (sin animaciones)".
- Paginación: "Mostrar 20 más (quedan 43)".

## 10. Reglas anti-genérico y checklist de Fase 8
**QUÉ NO UTILIZAR**
- **Color y efectos:** gradientes de cualquier tipo; glassmorphism o blur; texto ámbar claro; verde como color de enlace o de hover genérico; modo oscuro.
- **Globo:** estrellas, atmósfera o arcos.
- **Layout:** hero + 3 tarjetas + CTA; carruseles; blobs; sombra en todo; exceso de pills; `Card` para becas; `rounded-xl`/`rounded-2xl`.
- **Contenido:** emojis, banderas, logos de instituciones; montos convertidos.
- **Tipografía:** Inter/Roboto/system como principal; Google Fonts CDN.
- **Librerías:** GSAP, Framer, Lottie, three.js a mano.
- **Patrones de interacción:** toasts para resultados, modales al entrar, scroll infinito.

**Checklist para `quality` / `reviewing-interface-quality`**
1. **Fuentes:** solo Newsreader y Plex desde `@fontsource/*`; body en Plex, títulos en Newsreader.
2. **Cifras:** `.num` en todas las fechas, conteos, "quedan X días" y montos; columna de cierre alineada a la derecha desde `sm`.
3. **Fechas:** "15 dic 2026", sin punto.
4. **Color:** solo los tokens de §3 (grep de HEX en `src/`); el verde solo en sus usos permitidos.
5. **Contraste y foco:** ratios verificados con axe; foco de 2 + 2 px visible y no tapado.
6. **Estados:** texto + icono distinto; se distinguen en escala de grises y con simulador de deuteranopía.
7. **Tablero:** filas con filetes; sin `Card`, sin `shadow-*` fuera de Sheet/Popover, radios ≤ 4 (salvo Sheet).
8. **Nota de fuente:** en cada fila (compacta) y en cada ficha (completa); el CTA muestra el dominio.
9. **Globo:**
   - sin atmósfera, estrellas, texturas, arcos ni auto-rotación;
   - `MeshBasicMaterial` y un solo tono;
   - leyenda visible;
   - la rueda no hace zoom;
   - vista inicial sobre el Atlántico;
   - canvas `aria-hidden` + índice de países.
10. **Móvil:** globo solo bajo demanda y a pantalla completa, con "Cerrar globo"; el scroll de la home nunca queda atrapado.
11. **Reduced-motion:** todo instantáneo y "Mostrar globo (sin animaciones)".
12. **Objetivos táctiles:** ≥ 24 px (44 en táctil).
13. **Estados presentes:** cargando, vacío con sugerencias, error con alert, parcial, fallback por motivo, no encontrada, temporada baja.
14. **Microcopy:** el de §9, literal, en tuteo y sin emojis.
15. **Anti-generic check:** con el logo tapado, la app se reconoce.

## Riesgos
1. **Fuentes:** existen en npm (verificado); falta comprobar al instalar los pesos, latin-ext y `tnum`. Si falla, usar el plan B de §2.
2. **Valores por defecto de Lovable:** Inter, Card rounded-xl, `--accent` de marca, gradientes. El brief debe pegar literalmente §3, §5, §7 y "QUÉ NO UTILIZAR"; revisar con `get_diff`.
3. **API de react-globe.gl** (`polygonCapMaterial`, `globeMaterial`) por versión: verificar en el spike. Sin `MeshBasicMaterial`, los ratios del globo dejan de estar garantizados.
4. **Verde y ocre** tienen luminancia parecida (deuteranopía): texto + icono son obligatorios, nunca solo color.
5. **Selección en el globo** a 2,75:1: el texto acompaña siempre a la selección.
6. **GeoJSON 110m** omite microestados: los cubren el índice y "¿Buscabas…?".
7. **Globo persistente** al volver de la ficha: conservar la instancia o reservar la caja (CLS).
8. **Borde de la esfera** sutil (1,15:1): si en pruebas no se lee como globo, oscurecer el océano manteniendo iluminado/apagado ≥ 3:1.

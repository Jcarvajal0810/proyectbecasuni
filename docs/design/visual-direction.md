# Dirección Visual — Becas Verificables

**Producto:** buscador de becas internacionales con procedencia verificable
**Alcance de este documento:** MVP `search-first` (interfaz web)
**Estado:** dirección aprobada para implementación
**Fuente de verdad del comportamiento:** `docs/data-strategy/data-strategy.md`, `docs/architecture/architecture.md`

> Este documento no describe decoración. Describe qué hace que este producto sea
> reconocible como *este* producto y no como una plantilla de buscador.

---

## 1. Design Brief

**Purpose.** Permitir que un estudiante compare becas y decida cuáles merece la pena
aplicar, con evidencia verificable en la fuente oficial, no con texto promocional.

**Audience.** Estudiantes de bachillerato y universidad en Hispanoamérica, 16–24 años,
móvil primero, con tráfico limitado, conexión intermitente y tolerancia baja a la
frustración. El segundo usuario es el evaluador institucional que audita la plataforma.

**Context.** Búsqueda y comparación en condiciones de alta incertidumbre: el estudiante
no sabe si lo que lee es cierto, si la beca sigue abierta, ni cuánto le falta. La
interfaz es, funcionalmente, un **instrumento de medición en la oscuridad**.

**Tone.** Sosegado, veraz, técnico sin ser frío, editorial sin ser académico. Nunca
promocional. Nunca alarmista. La incertidumbre se declara con franqueza, no se disimula.

**Visual concept.** **Instrumentación editorial.** Dos registros visuales en tensión
deliberada:

- **El cuarto oscuro** — superficies azul-negro casi planas, iluminadas por una única
  fuente de luz virtual desde arriba. Lo que cuenta emerge de la penumbra.
- **El documento citado** — bloques cálidos, hundidos, con filete y tipografía de
  cita, para material verbatim proveniente de terceros (fuente oficial, requisitos textuales,
  nota de descubrimiento).

Esta tensión es la identidad del producto: **lo que el sistema afirma frente a lo que
la fuente dice.**

**Memorable element.** El **epígrafe de fuente**: una línea verbatim, con filete y
atribución, que ancla cada resultado a su procedencia. Es el momento que el usuario
recuerda de becas verificables.

**Restraint.** Dos colores de acción (azul primario, cian `UNKNOWN`), una luz, una
escala tipográfica, cero ornamento sin función. La decoración debe justificarse en
una frase; si no puede, se elimina.

**Typography direction.** Display grotesco geométrico con carácter (no Inter, no
Roboto, no Arial). Texto de sistema de alta x-height para lectura larga en móvil.
Mono para evidencia, fechas y metadatos. Cifras siempre tabulares.

**Motion direction.** Solo movimiento que explica un cambio de estado. Sin
parallax, sin gradientes animados, sin entradas coreografiadas. Se desactiva por
completo bajo `prefers-reduced-motion`.

---

## 2. Dirección artística

**Concepto dominante: instrumentación editorial** — un instrumento de medición
científico, presentado con disciplina editorial.

**Influencias conceptuales (no referencias visuales a copiar):**

| Referencia | Qué se toma | Qué se descarta |
| --- | --- | --- |
| Instrumentación científica de laboratorio | Lectura de estado por geometría, luz única, tipografía técnica, cero ornamento | Plástico skeuomórfico, manómetros, metalizado |
| Maquetación editorial / journals | Filetes, jerarquía tipográfica, bloques de cita, uso generoso de espacio | Serifas de revista, columnas de texto larga, textura de papel |
| Catalogación de archivo | Metadatos en mono, convenciones explícitas, orden por criterio | Skeuomorfismo de carpetas, iconos de carpeta |
| Terminal de escritorio de datos | Densidad honesta, estados discretos, sin animación decorativa | Fósforo verde, glitch, scanlines |
| Instrumento de navegación (brújula, carta náutica) | Atmósfera nocturna, línea de horizonte, luz azul rasante | Estrellas, nebulosa, cromatismo espacial |

**Metáfora rectora:** *medir antes de prometer.*

**Lo que esta dirección NO es:** no es "SaaS moderno". No es "dark mode". No es
"tech". Si una captura de la interfaz podría pegar sin cambios en un producto de
gestión de tareas, esta dirección falló.

---

## 3. Concepto visual y anti-generic

La identidad no proviene del color (hay un azul por obligación) sino de tres
decisiones estructurales verificables:

### 3.1 Doble registro de material
El producto usa **dos familias de superficie con temperatura de color opuesta**:

- **Fresco** (`--surface-0` … `--surface-3`): azul-negro. Lo que el sistema produce:
  resultados, filtros, comparador, metadatos propios.
- **Cálido** (`--surface-verbatim`): pardo casi negro. Lo que **otra persona
  escribió**: citas textuales, extractos de fuente oficial, notas de descubrimiento.

Regla dura: **el texto que el sistema afirma va en `#F5F7FF` (frío). El texto que
cita una fuente va en `#B5AFA6` (cálido).** El cambio de temperatura de color de la
tinta es la señal de que cambió la autoría de la frase. Ninguna otra señal lo sustituye.

### 3.2 Estados como geometría, no como color
Los seis estados se distinguen por **forma de la marca**, y el color solo confirma:

| Estado | Marca | Tratamiento | Relleno |
| --- | --- | --- | --- |
| `OPEN` | Punto lleno con halo | Halo sólido | Relleno sólido |
| `UPCOMING` | Punto lleno | Sin halo | Contorno |
| `UNKNOWN` | Punto con **anillo discontinuo** | **Discontinuo** | **Borde punteado** |
| `PAUSED` | **Dos barras paralelas** | Sin halo | Contorno |
| `CLOSED` | **Una barra horizontal** | Rebajado | Contorno atenuado |
| `EXPIRED` | **Círculo con corte** | Rebajado | Ninguno |

`UNKNOWN` **nunca** comparte geometría con `CLOSED`. Este es el diferenciador crítico
de la plataforma.

### 3.3 La evidencia tiene masa visual
`source_url`, `last_verified_at`, la fuente oficial y el extracto textual ocupan más
jerarquía y más superficie que el título del programa y el countdown. Eso es el
inverso de lo que hace la industria, y es legible como decisión de diseño, no como
olvido.

### 3.4 Prueba anti-generic

| Prueba | Resultado |
| --- | --- |
| ¿Podría ser de cualquier startup? | No: los estados discretos + doble registro de tinta son específicos de dominio |
| ¿Parece plantilla de Tailwind? | No: sin gradientes, sin `rounded-xl`, sin grid de 3 tarjetas |
| ¿Depende de gradiente genérico? | No: gradiente explícitamente prohibido |
| ¿Tipografía con intención? | Sí: Satoshi + Geist + Geist Mono, tres roles |
| ¿Paleta con lógica? | Sí: un acento de acción, un acento de incertidumbre, un material cálido |
| ¿Composición con intención? | Sí: rail instrumental fijo + grid asimétrico de dos columnas desiguales |
| ¿Elemento memorable? | Sí: epígrafe de fuente |
| ¿Animaciones con propósito? | Sí: solo cambios de estado y de layout |
| ¿Estética relacionada con el producto? | Sí: medición de incertidumbre |

---

## 4. Sistema de color

Todos los valores de este documento fueron **verificados por cálculo WCAG 2.x** (no
estimados). Se listan las razones de contraste reales.

### 4.1 Superficies

| Token | Hex | Luminancia | Uso |
| --- | --- | --- | --- |
| `--surface-0` | `#050510` | 0.0018 | Fondo raíz. **Vacío absoluto.** |
| `--surface-1` | `#0A0A18` | 0.0035 | Chrome, barras, encabezado de columna |
| `--surface-2` | `#101022` | 0.0060 | **Superficie de tarjeta.** Paneles, filas, campos |
| `--surface-3` | `#16162E` | 0.0094 | Superficie elevada: hover de fila, menús, popovers |
| `--surface-inset` | `#08080F` | 0.0026 | Zócalos, wells, código inline, track de progreso |
| `--surface-verbatim` | `#100E0C` | 0.0045 | Bloque citado de terceros (registro cálido) |

Todas las superficies están entre 0.0018 y 0.0094 de luminancia: la interfaz es
**genuinamente oscura**, no gris oscuro. La profundidad se construye con filete y
tono, no con sombra difusa.

### 4.2 Tinta

| Token | Hex | Sobre `--surface-0` | Sobre `--surface-2` | Rol |
| --- | --- | --- | --- | --- |
| `--text-primary` | `#F5F7FF` | **18.96** | 17.54 | Título, valor de campo |
| `--text-secondary` | `#C3C8DC` | **12.18** | 11.27 | Cuerpo, etiquetas |
| `--text-muted` | `#9AA0BC` | **7.85** | 7.26 | Metadatos, fuente, fecha de verificación |
| `--text-faint` | `#767C9B` | **4.95** | 4.58 | Metadatos no esenciales |
| `--text-verbatim` | `#B5AFA6` | 8.85 (sobre verbatim) | — | **Cita de tercero** |
| `--text-accent` | `#4D7CFE` | **5.44** | 5.03 | Enlace, acción |
| `--text-accent-hi` | `#7C9CFF` | **7.78** | 7.20 | Enlace sobre superficie elevada |

**Restricción verificada `--text-faint`:** `#767C9B` da **4.31** sobre `--surface-3`,
por debajo de 4.5. Regla: sobre `--surface-3`, todo el texto —incluido metadato— usa
`--text-muted` o superior. `--text-faint` queda para iconografía y elementos no
informativos sobre superficies 0–2.

**Restricción verificada `--text-accent`:** da **4.74** sobre `--surface-3`, el mínimo
aceptable. No se usa texto de acento sobre ninguna superficie más clara que
`--surface-3`.

### 4.3 Estados (el corazón del producto)

Verificado contra las cinco superficies:

| Estado | Hex | Rango real | Veredicto |
| --- | --- | --- | --- |
| `OPEN` | `#3DDC84` | 9.90 – 11.36 | AA |
| `UPCOMING` | `#9BB0F5` | 8.35 – 9.58 | AA |
| `UNKNOWN` | `#5EC6DA` | 8.89 – 10.20 | AA |
| `PAUSED` | `#E2A33F` | 8.03 – 9.22 | AA |
| `CLOSED` | `#7C7A93` | 4.26 – 4.89 | AA con reserva |
| `EXPIRED` | `#A08A76` | 5.38 – 6.17 | AA |

**Reservas reales, documentadas:**
- `CLOSED` da **4.26** sobre `--surface-3`. Bajo 4.5. Regla: sobre `--surface-3`, el
  texto de `CLOSED` usa el escape `--text-closed-on-3: #9A98B2` (**6.32** sobre
  `--surface-3`). Los chips de estado además **no usan** `--surface-3` como fondo: el
  hover de un chip cambia filete y tinta, no eleva el fondo.
- Ningún estado se comunica solo con color. Matriz de contraste entre estados
  (valores reales, 1.0 = indistinguible):

```
OPEN↔PAUSED 1.23   OPEN↔UNKNOWN 1.11   OPEN↔UPCOMING 1.19
UPCOMING↔PAUSED 1.04   UPCOMING↔UNKNOWN 1.06
UNKNOWN↔PAUSED 1.11   UNKNOWN↔CLOSED 2.09   OPEN↔CLOSED 2.32
```

`UPCOMING` y `PAUSED` son **1.04:1**: idénticos en luminancia. Esto es la prueba
numérica de que el color **no puede** transportar el significado del estado. La
geometría y la etiqueta de §3.2 son obligatorias, no decorativas.

### 4.4 Acentos y control

| Token | Hex | Verificado |
| --- | --- | --- |
| `--accent` | `#4D7CFE` | 5.44 sobre `surface-0`; 5.03 sobre `surface-2` |
| `--accent-hover` | `#6D93FF` | 7.02 sobre `surface-0` |
| `--accent-dim` | `#2E56D8` | 3.32 — **solo elementos no textuales** |
| `--accent-on` | `#050510` | **5.44 sobre `--accent`** |
| `--focus-ring` | `#9DC0FF` | 11.02 sobre `surface-0`, 10.20 sobre `surface-2` |
| `--focus-ring-inner` | `#050510` | 5.44 sobre `--accent` |

**Hallazgo crítico verificado — el botón primario NO lleva texto blanco.**
`#FFFFFF` sobre `#4D7CFE` da **3.73:1** y sobre `#6D93FF` da **2.89:1**: ambos fallan
AA, y el hover falla incluso para texto grande. `#F5F7FF` sobre `#4D7CFE` da 3.49,
también falla.

**Regla:** el botón primario usa **tinta oscura `#050510` sobre relleno azul**
(5.44:1 en reposo, 7.02:1 en hover). Es una decisión forzada por la accesibilidad y,
por suerte, encaja con el concepto: texto grabado en una superficie iluminada.

### 4.5 Filetes

| Token | Hex | Rango | Uso permitido |
| --- | --- | --- | --- |
| `--line-subtle` | `#1C1C31` | 1.18 – 1.22 | **Solo decorativo.** Separación dentro de la misma superficie |
| `--line` | `#2B2B48` | 1.44 – 1.49 | **Solo decorativo.** Divisores internos |
| `--line-strong` | `#41415F` | 1.92 – 2.07 | Enfatización. **No** usar como borde de control |
| `--line-control` | `#636A93` | **3.38 – 3.88** | **Borde de control interactivo.** Cumple 3:1 |
| `--line-verbatim` | `#6B5C4B` | 2.99 sobre verbatim | Filete cálido de cita. Estructural, no requisito de identificación |

Hallazgo verificado: los tokens de borde originales (`#41415F`, 2.07) **fallan** el
mínimo de 3:1 para componentes de interfaz. Por eso existe `--line-control: #636A93`
como token separado y no se puede sustituir por `--line-strong`.

### 4.6 Rampa de datos (coropleta futura)

5 clases, espaciado amplio y deliberado:

`#16265F` → `#22409B` → `#3560D8` → `#5B87FF` → `#9DB6FF`

Contraste adyacente 1.54 / 1.68 / 1.67 / 1.66; contra el vacío 1.43 → 10.21.

**Ningún filete simple alcanza 3:1 contra las cinco clases** (verificado: `#9BA1C4`
da 5.61 contra la clase más oscura pero 1.28 contra la más clara). Por eso el mapa
usa **trazo doble** — casing claro `#9BA1C4` + casing oscuro `#050510` — y **etiqueta
de valor directa en cada país**, más leyenda. El texto de valor, no el color de
relleno, es lo que comunica el dato.

`--no-data`: trama diagonal (patrón CSS, nunca color liso) con el texto `Sin datos`
obligatorio. Nunca se representa `no data` con el mismo relleno que la clase más baja.

---

## 5. Tipografía

### 5.1 Familias

| Rol | Fuente | Fallback | Razón |
| --- | --- | --- | --- |
| **Display** | **Satoshi** | Plus Jakarta Sans, system-ui | Grotesco geométrico con carácter; corte diagonal reconocible en la `a`, `g` y `t`. Evita Inter/Roboto/Arial |
| **Body** | **Geist** | Public Sans, system-ui | x-height alta, gris de trazo estable para lectura larga en móvil a 320px |
| **Mono** | **Geist Mono** | JetBrains Mono, ui-monospace | Cifras de ancho fijo, probada en densidad alta |

Fallbacks y pesos: Satoshi 500/700 · Geist 400/500/600 · Geist Mono 400/500.
Auto-hospedadas o vía proveedor con `font-display: swap` y precarga de los pesos
críticos. Ninguna fuente se carga desde un CDN de terceros sin `preconnect`.

### 5.2 Escala (razón 1.25 sobre base 16, con dos saltos menores de precisión)

| Token | Tamaño / interlineado | Peso | Uso | Máx. longitud |
| --- | --- | --- | --- | --- |
| `--type-display` | 40 / 44 | 500 | Título de página. **Uno por vista** | 28ch |
| `--type-h1` | 28 / 34 | 500 | Título de resultado | 40ch |
| `--type-h2` | 20 / 28 | 500 | Título de sección, etiqueta de bloque | 52ch |
| `--type-h3` | 16 / 24 | 600 | Título de campo, chip | — |
| `--type-body` | 15 / 24 | 400 | Descripción, contenido | **68ch** |
| `--type-body-sm` | 13.5 / 21 | 400 | Descripción en móvil y columnas densas | 62ch |
| `--type-label` | 12 / 16 | 500 | Etiqueta de campo, mayúscula espaciada 0.06em | — |
| `--type-meta` | 12.5 / 18 | 400 | Fuente, `last_verified_at`, conteos | — |
| `--type-mono` | 12.5 / 18 | 400 | URL, precisión de fecha, evidencia | — |
| `--type-verbatim` | 16 / 26 | 400 | **Cita de fuente**, serifada opcional | 58ch |

Todas las cifras: `font-variant-numeric: tabular-nums`. Esto es una decisión de
legibilidad, no un detalle: columnas de fechas, montos y conteos deben alinearse
verticalmente para poder compararse de un vistazo.

### 5.3 Microtipografía

- Etiquetas: `text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px`.
- Epígrafe de fuente: filete vertical de 2px a la izquierda, `--line-verbatim`,
  `--text-verbatim`, un filete de 28ch al pie con el dominio de la fuente en mono 12.5.
- Cifras de countdown: `--type-mono`, tabular. **Nunca** un timer animado.
- Sin texto en font-size bajo 12px. Sin pesos intermedios inventados.

---

## 6. Espaciado y grid

### 6.1 Escala (base 4pt, sin excepciones)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 128`

Regla dura: **ningún componente inventa un valor**. Si hace falta un espacio que no
está en la escala, se usa el superior más cercano y se documenta la excepción.

Ritmo vertical: los bloques usan múltiplos de 8; los metadatos internos usan 4.

### 6.2 Grid

- Columnas: **12**, gutter **24px**, margen exterior **24 / 40 / 64px**
  (móvil / tablet / escritorio).
- Ancho máximo de contenido: **1240px**. Por encima de 1240 el texto no crece:
  se alinea al rail.
- **Rail instrumental: 72px fijo a la izquierda** en ≥1024px (§7.3). El contenido
  comienza en `72 + 24 = 96px`.
- **Composición asimétrica:** vista de resultados en dos columnas desiguales
  `1fr / 0.62fr` (lista + panel de evidencia). **No** `1fr / 1fr`.
- Encabezado de sección: etiqueta a la izquierda en 12ch, contenido a la derecha.
  Rejilla editorial, no centrada.
- En <1024px el rail se convierte en barra superior de 56px y la vista pasa a
  una columna, con el panel de evidencia movido **debajo** del resultado.

### 6.3 Ritmo de densidad

Una sola densidad en escritorio (cómoda), una sola en móvil (compacta). **No** hay
modos "cómodo / compacto" seleccionables: es ruido de opciones.

---

## 7. Forma, profundidad y composición

### 7.1 Lenguaje de forma

| Radio | Valor | Uso |
| --- | --- | --- |
| `--radius-xs` | 2px | Chips de estado, trazos del anillo `UNKNOWN` |
| `--radius-sm` | 4px | Botones de icono, campos inline |
| `--radius-md` | 6px | **Botón, campo, chip de filtro** |
| `--radius-lg` | 10px | Superficie de tarjeta, panel |
| `--radius-xl` | 14px | Modal, panel de evidencia (única superficie con `xl`) |
| `--radius-full` | 999px | **Solo el punto de estado**, 8px de diámetro |

**Prohibido** `rounded-xl` como radio por defecto. Solo una superficie por vista puede
usar `--radius-xl`, y debe ser la que contiene la evidencia.

**Geometría especial:**

- Esquina **marcada** (chamfer de 6px, esquina inferior derecha) en cualquier tarjeta
  con `UNKNOWN`: la falta de información es visible en la silueta, incluso en
  miniatura o sin color.
- Campo de búsqueda: **sin radio visible**, borde de 1px `--line-control`,
  `--radius-sm`. Recto, no flotante.

### 7.2 Profundidad

Cinco niveles, declarados por token:

| Nivel | Token | Composición |
| --- | --- | --- |
| 0 | `--surface-0` | Plano, sin filete |
| 1 | `--surface-1` | Filete inferior 1px `--line-subtle` |
| 2 | `--surface-2` + `--line` | Borde 1px completo |
| 3 | `--surface-3` | Fondo elevado, sombra `0 1px 2px rgba(0,0,0,.4)` |
| 4 | Overlay | `--surface-3` + sombra `0 16px 48px rgba(0,0,0,.55)` |

- **Una sola dirección de luz, desde arriba.** Todas las sombras hacia abajo.
  Cero sombras difusas de largo alcance en superficies de datos.
- **Profundidad por filete antes que por sombra.** Una tarjeta se levanta con un
  borde de 1px más visible, no con una sombra grande.
- Sombra permitida únicamente para: menús, popovers, modales y barra fija.
- **Glassmorphism: no.** Ningún `backdrop-filter`. La barra sticky usa
  `--surface-1` opaco; la legibilidad de la evidencia no depende de lo que haya
  detrás.
- Gradientes: prohibidos en superficies. El único uso admitido es una rampa de datos
  o un wash de 6% del acento para distinguir un estado seleccionado.

### 7.3 Composición

Estructura por vista, derivada del producto (no plantilla):

```
┌──┬─────────────────────────────────────────────┐
│  │ etiqueta de sección          12 de 24 Becas   │  ← rail: estado + frescura
│R ├───────────────────────────────────────────────┤
│A │  filtros activos como chips con contador      │  ← una fila, sin panel plegable
│I ├──────────────────────────────┬────────────────┤
│L │  resultado 01                │  EVIDENCIA     │  ← 1fr / 0.62fr
│  │  título · fuente oficial     │  verbatim      │
│  │  estado · cierre · countdown │  fuente_url    │
│  │  ────────────────────────    │  verificado    │
│  │  resultado 02                │  ──────────────│
└──┴──────────────────────────────┴────────────────┘
```

Lo que esta composición dice: **el resultado y su evidencia son dos cosas
distintas, y la evidencia es un panel, no un añadido dentro de la tarjeta.**

---

## 8. Iconografía

- **Lucide**, 1.5px de trazo, `20px` por defecto, `16px` en tabla densa.
- Cuadrícula de 24, sin iconos rellenos, sin variante "accent".
- **Nunca icon-only para estado.** El estado es `forma + etiqueta de texto`.
- Iconos con función:
  - `external-link` en `source_url`, con `aria-label="Abrir fuente oficial (nueva pestaña)"`.
  - `check-circle-2` en `OPEN`, `clock` en `UPCOMING`, `help-circle` en `UNKNOWN`,
    `pause-circle` en `PAUSED`, `x-circle` en `CLOSED`, `archive` en `EXPIRED`.
  - `shield-check` reservado para "fuente oficial verificada" — **único** uso de icono de confianza.
- **Prohibido:** iconos decorativos, sets de gradiente, emojis como iconografía,
  logos de terceros como señal de calidad (el dominio de la fuente es la señal).

---

## 9. Movimiento

**Principio:** el movimiento explica un cambio de estado. Nada se mueve para demostrar
que la interfaz funciona.

| Elemento | Qué se mueve | Por qué | Duración | Easing |
| --- | --- | --- | --- | --- |
| Cambio de estado en chip | Punto → geometría nueva (barras, corte, discontinuo) | Comunica que el significado cambió, no solo el color | 160ms | `cubic-bezier(.2,0,0,1)` |
| Fila de resultado al cambiar de filtro | Salida a opacidad 0 + traslación Y 4px | Comunica que el contenido fue reemplazado, no recargado | 120ms out / 200ms in | `ease-out` |
| Panel de evidencia | Ancho desde el origen de la columna | La procedencia acompaña a la selección | 220ms | `cubic-bezier(.2,0,0,1)` |
| Foco de teclado | Anillo de foco, sin transición de color | Ubicación inmediata, sin animación espuria | 0ms | — |
| `prefers-reduced-motion` | **Todo el movimiento eliminado** | El cambio de estado se señala solo con geometría, sin animación | 0ms | — |

**Prohibido:** paralaje, gradientes animados, esqueleto pulsante en bloques de texto
(usar un esqueleto estático con filete de 1.5px y opacidad fija), transición de página,
escalonamiento en listas, conteo numérico animado, pulso en distintivos.

**Countdown (DS-05):** estático. Se muestra como texto tabular. Si los segundos no
aportan decisión, no hay segundos. No hay animación de cuenta atrás.

---

## 10. Elemento memorable

### El epígrafe de fuente

```
 │  "The 2026 BMO Awards accept applications from 1 September 2026.
 │   Applicants must be enrolled full-time at a degree-granting institution."
 ─────────────────────────────────────────────────────────────────────────
 bmo.org/awards · verificado 14 ago 2026, 09:20 UTC
```

**Por qué es el elemento memorable:** el producto entero cabe en ese bloque. La
interfaz dice "esto está abierto", pero la memoria del usuario es una frase que
**otra persona escribió**, con su filete cálido, su tipografía distinta y su
procedencia anotada.

**Por qué funciona y no es decoración:**

- Convierte el requisito legal de citar la fuente en la firma visual del producto.
- La tinta cálida (`#B5AFA6`) sobre el zócalo cálido (`#100E0C`) separa la autoría de
  un vistazo, sin necesidad de un distintivo.
- Es el único bloque de la interfaz con filete a la izquierda; aparece una vez por
  resultado seleccionado y por vista de detalle.

**Reglas:** el texto es **verbatim**, nunca resumido ni parafraseado. Sin comillas
tipográficas decorativas. Con el dominio de origen, no la URL completa, salvo en la
vista de detalle. Si el texto no es verificable, **el bloque no se renderiza**.

---

## 11. Tokens

### 11.1 CSS custom properties

```css
:root {
  /* ── Superficies ───────────────────────────────── */
  --surface-0:          #050510;
  --surface-1:          #0A0A18;
  --surface-2:          #101022;
  --surface-3:          #16162E;
  --surface-inset:      #08080F;
  --surface-verbatim:   #100E0C;

  /* ── Tinta ──────────────────────────────────────── */
  --text-primary:       #F5F7FF;
  --text-secondary:     #C3C8DC;
  --text-muted:         #9AA0BC;
  --text-faint:         #767C9B;
  --text-verbatim:      #B5AFA6;
  --text-accent:        #4D7CFE;
  --text-accent-hi:     #7C9CFF;
  --text-closed-on-3:   #9A98B2;

  /* ── Acentos ────────────────────────────────────── */
  --accent:             #4D7CFE;
  --accent-hover:       #6D93FF;
  --accent-dim:         #2E56D8;
  --accent-on:          #050510;
  --focus-ring:         #9DC0FF;
  --focus-ring-inner:   #050510;

  /* ── Estados ────────────────────────────────────── */
  --state-open:         #3DDC84;
  --state-upcoming:     #9BB0F5;
  --state-unknown:      #5EC6DA;
  --state-paused:       #E2A33F;
  --state-closed:       #7C7A93;
  --state-expired:      #A08A76;

  /* ── Filetes ────────────────────────────────────── */
  --line-subtle:        #1C1C31;
  --line:               #2B2B48;
  --line-strong:        #41415F;
  --line-control:       #636A93;
  --line-verbatim:      #6B5C4B;
  --line-map-casing:    #9BA1C4;

  /* ── Datos ──────────────────────────────────────── */
  --data-1:             #16265F;
  --data-2:             #22409B;
  --data-3:             #3560D8;
  --data-4:             #5B87FF;
  --data-5:             #9DB6FF;

  /* ── Tipografía ─────────────────────────────────── */
  --font-display: "Satoshi", "Plus Jakarta Sans", system-ui, sans-serif;
  --font-body:    "Geist", "Public Sans", system-ui, sans-serif;
  --font-mono:    "Geist Mono", "JetBrains Mono", ui-monospace, monospace;

  --type-display:   40px;  --lh-display: 44px;
  --type-h1:        28px;  --lh-h1:      34px;
  --type-h2:        20px;  --lh-h2:      28px;
  --type-h3:        16px;  --lh-h3:      24px;
  --type-body:      15px;  --lh-body:    24px;
  --type-body-sm: 13.5px;  --lh-body-sm: 21px;
  --type-label:     12px;  --lh-label:   16px;
  --type-meta:    12.5px;  --lh-meta:    18px;
  --type-verbatim:  16px;  --lh-verbatim:26px;

  /* ── Espaciado (base 4) ─────────────────────────── */
  --sp-1:  4px; --sp-2:  8px; --sp-3: 12px; --sp-4: 16px;
  --sp-5: 20px; --sp-6: 24px; --sp-8: 32px; --sp-10: 40px;
  --sp-12: 48px; --sp-16: 64px; --sp-20: 80px;
  --sp-24: 96px; --sp-32: 128px;

  /* ── Forma ──────────────────────────────────────── */
  --radius-xs: 2px; --radius-sm: 4px; --radius-md: 6px;
  --radius-lg: 10px; --radius-xl: 14px; --radius-full: 999px;

  /* ── Sombra (dirección única, hacia abajo) ──────── */
  --shadow-3: 0 1px 2px rgba(0, 0, 0, .4);
  --shadow-4: 0 16px 48px rgba(0, 0, 0, .55);

  /* ── Capas ──────────────────────────────────────── */
  --z-base: 0; --z-raised: 10; --z-sticky: 100;
  --z-popover: 200; --z-overlay: 300; --z-toast: 400;

  /* ── Layout ─────────────────────────────────────── */
  --rail-w: 72px;
  --content-max: 1240px;
  --gutter: 24px;

  /* ── Movimiento ─────────────────────────────────── */
  --dur-micro: 120ms; --dur-state: 160ms; --dur-panel: 220ms;
  --ease-out: cubic-bezier(.2, 0, 0, 1);

  /* ── Foco ───────────────────────────────────────── */
  --focus-w: 2px;
  --focus-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  :root { --dur-micro: 0ms; --dur-state: 0ms; --dur-panel: 0ms; }
}
```

**Foco visible (WCAG 2.4.11):** anillo doble —
`box-shadow: 0 0 0 var(--focus-ring-inner) 0, 0 0 0 calc(var(--focus-w) + var(--focus-offset)) var(--focus-ring);`
El anillo interno garantiza separación en cualquier fondo, incluido el propio azul de acento
(`#050510` sobre `#4D7CFE` = 5.44:1; `#9DC0FF` sobre `#4D7CFE` = 2.03:1, por eso el anillo interno es obligatorio).

### 11.2 Tailwind theme

```json
{
  "theme": {
    "extend": {
      "colors": {
        "surface": {
          "0": "#050510", "1": "#0A0A18", "2": "#101022",
          "3": "#16162E", "inset": "#08080F", "verbatim": "#100E0C"
        },
        "ink": {
          "primary": "#F5F7FF", "secondary": "#C3C8DC", "muted": "#9AA0BC",
          "faint": "#767C9B", "verbatim": "#B5AFA6", "onAccent": "#050510",
          "closedOn3": "#9A98B2"
        },
        "accent": { "DEFAULT": "#4D7CFE", "hover": "#6D93FF", "dim": "#2E56D8" },
        "focus": { "ring": "#9DC0FF", "inner": "#050510" },
        "state": {
          "open": "#3DDC84", "upcoming": "#9BB0F5", "unknown": "#5EC6DA",
          "paused": "#E2A33F", "closed": "#7C7A93", "expired": "#A08A76"
        },
        "line": {
          "subtle": "#1C1C31", "DEFAULT": "#2B2B48", "strong": "#41415F",
          "control": "#636A93", "verbatim": "#6B5C4B", "mapCasing": "#9BA1C4"
        },
        "data": {
          "1": "#16265F", "2": "#22409B", "3": "#3560D8", "4": "#5B87FF", "5": "#9DB6FF"
        }
      },
      "fontFamily": {
        "display": ["Satoshi", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        "body": ["Geist", "Public Sans", "system-ui", "sans-serif"],
        "mono": ["Geist Mono", "JetBrains Mono", "ui-monospace", "monospace"]
      },
      "fontSize": {
        "display": ["40px", { "lineHeight": "44px" }],
        "h1": ["28px", { "lineHeight": "34px" }],
        "h2": ["20px", { "lineHeight": "28px" }],
        "h3": ["16px", { "lineHeight": "24px" }],
        "body": ["15px", { "lineHeight": "24px" }],
        "body-sm": ["13.5px", { "lineHeight": "21px" }],
        "label": ["12px", { "lineHeight": "16px", "letterSpacing": "0.06em" }],
        "meta": ["12.5px", { "lineHeight": "18px" }],
        "verbatim": ["16px", { "lineHeight": "26px" }]
      },
      "borderRadius": {
        "xs": "2px", "sm": "4px", "md": "6px", "lg": "10px", "xl": "14px"
      },
      "boxShadow": {
        "3": "0 1px 2px rgba(0,0,0,.4)",
        "4": "0 16px 48px rgba(0,0,0,.55)",
        "focus": "0 0 0 2px #050510, 0 0 0 4px #9DC0FF"
      },
      "spacing": {
        "px": "1px", "rail": "72px", "content": "1240px"
      },
      "zIndex": {
        "base": "0", "raised": "10", "sticky": "100",
        "popover": "200", "overlay": "300", "toast": "400"
      },
      "transitionDuration": { "micro": "120ms", "state": "160ms", "panel": "220ms" }
    }
  }
}
```

`--line` no puede renombrarse a `DEFAULT` en un contexto donde colisione con el color de
borde de Tailwind; en la práctica se expone como `line.DEFAULT` y se referencia
explícitamente.

---

## 12. Responsive

| Breakpoint | Comportamiento |
| --- | --- |
| `<640px` | Una columna. Rail → barra superior 56px. `--type-display` 28px. Listado en tarjetas `--radius-lg`, espaciado `--sp-4`. Comparador como hojas apiladas, no columnas |
| `640–1023px` | Una columna con panel de evidencia debajo del resultado seleccionado. Body 15px |
| `≥1024px` | Rail 72px + grid 12 columnas + dos columnas `1fr / 0.62fr`. Body 15px |
| `≥1440px` | Contenido anclado a 1240px, alineado al rail. **El texto no crece** |

**Reglas transversales:**

- Objetivo táctil mínimo **44×44px** en todos los controles, aunque el radio visual sea menor.
- Densidad única por breakpoint. Sin preferencia de densidad por usuario.
- Modo de datos reducidos: sin `backdrop-filter`, sin animaciones, sin mapa en 3D,
  skeleton estático. El flujo completo es usable.
- La preferencia del sistema gana sobre cualquier valor por defecto del tema.

---

## 13. Futuro: globo 3D (fuera del MVP)

`ADR-001` mantiene el 3D fuera del MVP. Cuando exista:

- **Material:** `--surface-2` a `--surface-3` con borde `--line-control`. Sin glow,
  sin bloom, sin atmósfera, sin halo, sin arcos, sin partículas, sin campo de estrellas.
- **Coropleta sobre la esfera:** rampa `--data-1` … `--data-5`. Países con
  `--no-data` (trama diagonal + `Sin datos`), nunca el relleno más bajo.
- **Bordes:** trazo doble `--line-map-casing` `#9BA1C4` + `#050510`, porque ningún
  filete simple alcanza 3:1 contra las cinco clases (verificado).
- **Geografía decorativa prohibida:** continentes o países sin datos no se renderizan
  como "vacíos brillantes" ni con relieve. Silueta plana.
- **Interacción:** rotación por arrastre con inercia lenta (≤0.15 rad/frame). Se
  detiene de inmediato al soltar. Sin rotación automática. Sin zoom con la rueda.
- **Accesibilidad:** el 3D es **una representación alternativa, nunca la única**. Cada
  vista debe tener un equivalente 2D (lista o coropleta plana) accesible por teclado,
  y un botón de alternancia "Vista 2D / 3D" persistente.
- **Fallback obligatorio:** si WebGL falla, se cae a la coropleta 2D sin pérdida de
  función ni de datos.
- `prefers-reduced-motion` → **2D por defecto**, siempre.

---

## 14. Explícitamente prohibido

**Color y material**
- Gradientes violeta-a-azul en cualquier superficie, borde, texto, icono o fondo.
- `backdrop-filter` / glassmorphism.
- Neón, glow, bloom, box-shadow de color.
- Degradados de fondo, blobs, mesh gradients, noise/scanlines.
- Emoji como iconografía.

**Forma**
- `rounded-xl` como radio por defecto.
- Sombras difusas de largo alcance en superficies de datos.
- Gradientes con dirección distinta de "hacia abajo" en una sombra.
- Bordes dobles de acento decorativos.

**Composición**
- Hero + tres tarjetas + CTA como plantilla de sección.
- Grid perfectamente simétrico `1fr / 1fr` en vista de resultados.
- Centro de país no alineado al grid.
- Panel lateral flotante sin relación con la columna que acompaña.
- Botones idénticos en todas las vistas.

**Contenido**
- Estado comunicado solo por color.
- Estado comunicado solo por icono.
- Texto `UNKNOWN` renderizado en gris o adyacente a `CLOSED` en tono.
- Fuente o fecha de verificación con la misma jerarquía que el título del programa.
- Extracto de fuente parafraseado en lugar de verbatim.
- Countdown sin las seis condiciones de DS-05.
- Precisión de fecha `DATE` presentada como si fuera exacta.
- Urgencia presionada: textos como "¡Última oportunidad!" o cuentas regresivas de segundos.

**Movimiento**
- Animaciones sin función comunicativa.
- Count-up numérico, shimmer, stagger, parallax, pulso.

**Tipografía**
- Inter, Roboto o Arial como tipografía principal.
- Cifras no tabulares donde hay columnas comparables.
- Texto de más de 68ch.
- Texto por debajo de 12px.

---

## 15. Verificación de identidad

La implementación **perdió la identidad** si falla cualquiera de estas:

1. Los seis estados son distinguibles **en escala de grises** y con daltonismo.
2. El texto de fuente se reconoce como voz ajena **por temperatura de tinta**, no por
   un badge.
3. Existe un epígrafe de fuente verbatim visible en la vista de resultado.
4. El campo de búsqueda y el botón primario tienen silueta recta; nada flota.
5. La ausencia de un dato se ve en la **silueta** de la tarjeta, no solo en el color.
6. La vista de resultados es asimétrica y el panel de evidencia es una columna real.
7. Todos los contrastes de §4 se cumplen con los hex publicados, verificados por cálculo.
8. El botón primario lleva tinta oscura, no blanca.
9. No hay un solo gradiente en el código de estilos.
10. Cambiar el nombre del producto y el logo **no** permitiría reutilizar la interfaz
    sin redesign completo.

Si tres o más fallan, la implementación se revisa contra este documento, no contra
referencias externas.
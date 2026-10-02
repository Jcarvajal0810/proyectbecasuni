# UX Strategy — Becas internacionales verificables (MVP search-first)

> **Contexto de referencia:** discovery.md, architecture.md, value-impact-refinement.md, data-strategy.md, legal-matrix.md, security-baseline.md (2026-09-30). Sin código. 

## 1. Principios UX (alineados con discovery §9)

Principios que gobiernan todas las decisiones de diseño. Estos derivan de la tesis central: el producto existe para **verificar**, no para descubrir.

| # | Principio | Regla operativa | Razón de producto |
|---|---|---|---|
| 1 | **Confianza primero** | `source_url` + `last_verified_at` + dominio oficial deben ocupar la zona de máxima atención en cada item. El countdown, el estado y la fuente **nunca** ceden su jerarquía frente a elementos promocionales. | `discovery §9.1`: metadata de confianza supera a la promocional. U4 (asesora con riesgo reputacional) debe poder defender lo que ve. |
| 2 | **Honestidad de lo desconocido** | `UNKNOWN` **nunca** es gris, **nunca** es adyacente al badge `CLOSED`. Tiene su propio estilo visual y copy humano ("No verificable ahora · Última verificación: hace N días"). Countdown desactivado. | `discovery §4.5`, R7. El mayor daño es hacer leer "no sé" como "cerrado". |
| 3 | **Valor real > decoración** | Toda superficie visual debe justificar su existencia: si puede eliminarse sin afectar claridad o utilidad, se elimina. **No hay geografía decorativa** (fotos de campus, banderas de adorno). Única geografía permitida: coropleta de datos. | `discovery §9.2, §9.6, §9.12`. Anti-genérico, anti-AI-slop. |
| 4 | **Progressive disclosure** | Mostrar primero lo necesario para la **decisión** (estado, días restantes, fecha límite + base, entidad, monto o "No especificado", dominio fuente). Campos secundarios, desgloses o documentación se revelan en detalle, nunca saturan la lista. | `discovery §6` (UX), arquitectura favorece lectura de decisión primero (`discovery §3.1.3`). |
| 5 | **No inventar datos** | Dato ausente → `null` + copy explícito `No publicado`/`No especificado`. **Cero invención**. Ningún contador "10.000+ becas" sin respaldo. Demo siempre etiquetado y nunca mezclado con real. | `ADR-004`, `discovery §9.4, §9.5, D7`. |
| 6 | **Admitir lo que no sabemos** | `UNKNOWN` es estado de producto de primera clase. El diseño no obliga al sistema a adivinar: prefiere decir "no verificable ahora" y empujar al clic a la **fuente oficial**. | `discovery §4.5`, ADR-002. |
| 7 | **Móvil primero, deadline legible** | UI pensada para U1 (móvil de gama media). Deadline legible a brazo largo. Touch targets ≥44px, navegación por teclado prioritaria. | `discovery §1.3 U1`, `§9.10`. |
| 8 | **Accesible por construcción** | Contraste WCAG 2.2 AA, focus visible, sin depender únicamente del color para distinguir estados. | `discovery §9.10`, `building-accessible-interfaces`. |
| 9 | **Estado sano > estado ideal** | Todo componente considera default/hover/focus/active/loading/empty/error/success/partial/disabled/offline/processing. **No termina mientras solo funcione en su estado ideal.** | `discovery §7` (estados UI requeridos). |
| 10 | **Honestidad supera al pulido** | Un PR pulido que inventa un campo es una regresión. Uno plano pero trazable es una mejora. Cada componente nuevo se justifica con un fallo o un JTBD. | `discovery §9.9, §9.12`. |

## 2. User Journeys U1–U4

Priorizar **búsqueda → detalle → fuente oficial** (no globe-first). La shortlist es anónima. Post-MVP contempla fallback 2D, no 3D.

### Journey U1 — Lucía, 20, pregrado (Colombia) · móvil · sin login
**Contexto:** ansiosa por deadlines, móvil gama media, poca fricción deseada.

| Paso | Intención | Acción (UX) | Feedback/Estado | Punto de decisión |
|---|---|---|---|---|
| 0. Landing | ¿Hay becas útiles a su perfil? | Hero minimal: búsqueda única funcionando con datos reales (no titulares genéricos). Sin hero decorativo. | Skeleton breve mientras carga resultados. | Confianza: ve `last_verified_at` en primeros resultados. |
| 1. Búsqueda | Encontrar opciones viables | **Search-first**: campo prominente + filtros ligeros (nivel, país destino, financiación). Debounce 250–350ms. | Resultados con variables de decisión primero. Zero-results honesto, sin ensanchar filtros en silencio. | Ve estado + días restantes + base (o `unknown`) + dominio fuente. |
| 2. Explorar lista | Escanear rápido | Listado móvil-first denso pero legible. Tarjetas con metadata de confianza arriba. Monto muestra `No especificado` si falta. | Empty/Loading/Skeleton bien definidos. | Decide shortlist o abrir detalle. |
| 3. Ver detalle | Verificar antes de invertir tiempo | Enfatiza **fuente oficial** (botón/CTA prominente). Muestra `last_verified_at`, motivo si `UNKNOWN`, separación deadline-beca vs deadline-admisión. | Estados claros (Success/Partial/Error). | Clic obligado/consciente a fuente oficial. |
| 4. Shortlist | Guardar sin fricción | Añadir a shortlist **anónima** (token local). No pide login. URL compartible de solo lectura. | Feedback sutil (success). | Puede compartir con asesora sin cuenta. |
| 5. Acción externa | Postular | Salir a fuente oficial (`rel="noopener noreferrer"`). | No interfiere con shortlist. | Usuario confirma en fuente oficial (source-of-truth). |

### Journey U2 — Kwame, 29, profesional (Nigeria) · desktop · compara financiación
| Paso | Intención | Acción (UX) | Feedback/Estado | Punto de decisión |
|---|---|---|---|---|
| 0. Búsqueda dirigida | Comparar opciones | Filtros por financiación/monto + área + ventana deadline. | Resultados ordenados por relevancia/fecha límite con base conocida. | Enfatiza trazabilidad (fuente + verificación). |
| 1. Comparación | Evaluar trade-offs | Tarjetas muestran funding_type, amount (o `No especificado`), cobertura. Detalle desglosa financiación cuando existe. | Partial cuando faltan campos. | No compara campos inventados. |
| 2. Verificación | Reducir riesgo | Detalle muestra evidence de verificación (fecha + motivo UNKNOWN). | Expone `deadline_basis` (publisher_stated/inferred_from_cycle/unknown). | Solo avanza tras ver fuente oficial. |
| 3. Shortlist | Organizar opciones | Shortlist anónima persistida por token. Compartible. | Sin PII. | Comparte con criterio verificable. |

### Journey U3 — Dra. Ana, 34, PhD (México→Alemania) · desktop · investigación
| Paso | Intención | Acción (UX) | Feedback/Estado | Punto de decisión |
|---|---|---|---|---|
| 0. Búsqueda por área | Encontrar convocatorias temáticas | Búsqueda FTS sobre título+entidad+universidad. Facetas por área/fields. | Zero-results honesto. | Prioriza convocatorias con fuente verificable. |
| 1. Detalle profundo | Confirmar elegibilidad/funding | Muestra fields[], duración, cobertura, ECTS si disponible. Deadline_raw_text visible. | Partial/Success según completitud. | Necesita saber qué falta (`No publicado`). |
| 2. Verificación crítica | Evitar perder tiempo en convocatoria dudosa | Estado UNKNOWN explicado claramente + enlace a fuente. Countdown nunca aparece en UNKNOWN. | Recovery: reintento de verificación explicado sin cambiar estado a CLOSED. | Confía en transparencia sobre incertidumbre. |

### Journey U4 — Patricia, 48, asesora · desktop · riesgo reputacional
| Paso | Intención | Acción (UX) | Feedback/Estado | Punto de decisión |
|---|---|---|---|---|
| 0. Validar lista | Defender lista ante estudiantes | Ve metodología (pública) + estado + fuente + verificación por registro. Exportación CSV/imprimible de shortlist (post-MVP S4). | Muestra frescura por fuente (M4). | Necesita trazabilidad por campo/registro. |
| 1. Auditar riesgo | Detectar datos envejecidos | Badge visual cuando no re-verificado >14d (envejece visiblemente). UNKNOWN distinguible sin depender del color. | Estados semánticos + texto. | Retira ítems dudosos, no adivina. |
| 2. Compartir accionable | Entregar shortlist verificable | Shortlist solo lectura compartible (sin login). Contenido muestra misma metadata de confianza. | Sin inventar campos. | Lista defendible ante estudiante. |

**Principio común:** **búsqueda→detalle→fuente oficial**. Nunca globe-first. Shortlist anónima en todo el flujo.

## 3. IA: Mapa del sitio, rutas, taxonomías, jerarquía decisión primero

### Mapa del sitio
| Ruta | Propósito | Público | Prioridad MVP |
|---|---|---|---|
| `/` | Home search-first. Campo de búsqueda funcionando con datos reales + métricas de transparencia (frescura/cobertura real). Sin hero genérico. | U1–U4 | P0 |
| `/scholarships` | Resultados + filtros + facetas (nivel, área, país destino, financiación, ventana deadline, estado). | U1–U4 | P0 |
| `/scholarships/[slug]` | Detalle con variables de decisión primero + fuente oficial prominente + `last_verified_at` + separación deadline-beca/admisión. | U1–U4 | P0 |
| `/shortlist` | Shortlist anónima (token). URL compartible solo lectura (`/share/[slug]` implícito). | U1,U4 | P0 |
| `/metodologia` | Metodología pública (registros reales, fuentes, último run, qué significa "verificado", qué NO afirmamos). M3–M7 visibles. | U4 + confianza general | P0 |
| `/fuentes` | Fuentes y atribución (licencias, ToS, fecha revisión, volumen por fuente). Denylist/agregadores documentados. | Legal/transparencia | P0 |
| `/correcciones` (report) | "Report a correction" sin cuenta, encola `needs_review`. | Usuarios/U4 | P0 |

### Rutas y comportamiento
| Ruta | Estados esperados | Caching/UX |
|---|---|---|
| `/` | Loading, Success (con resultados reales), Empty (zero-results honesto) | RSC + caché edge para vistas públicas. Sin datos demo. |
| `/scholarships` | Loading/Skeleton, Success, Empty, Error (fetch). | Búsqueda con debounce + params URL compartibles. |
| `/scholarships/[slug]` | Loading, Success, Error (404/no publicado). Registro no publicable no aparece. | No indexa registros no publicados. |
| `/shortlist` | Empty (sin ítems), Success. | Persistido por token hash (no PII). |
| `/metodologia` | Success (números read-model). | Lee M3–M7 excluyendo `is_demo`. |

### Taxonomías (alineadas data-strategy)
| Eje | Valores (cerrados) | Notas |
|---|---|---|
| `country_iso2` / destino | ISO 3166-1 (FK countries) | Nunca fuzzy. `destination_countries[]` para multi-país (EMJM). Geografía visual solo coropleta. |
| `level` | UNDERGRAD, MASTER, PHD, RESEARCH, SHORT_TERM, UNKNOWN | Valores cerrados (CHECK). |
| `fields[]` | Áreas (multivalor) | Filtro GIN. Sin inventar taxonomías. |
| `modality` | ONLINE, IN_PERSON, HYBRID, UNKNOWN | — |
| `funding_type` | FULL, PARTIAL, TUITION, STIPEND, UNKNOWN | — |
| `deadline_basis` | publisher_stated, inferred_from_cycle, unknown | Determina si countdown aparece (§4.4 DS). |
| `deadline_precision` | MINUTE, HOUR, DATE, UNKNOWN | Crucial R6 (evita ±1 día). |
| `internal_status` | OPEN, CLOSED, UPCOMING, EXPIRED, PAUSED, UNKNOWN | 6 estados. Fuente gana sobre inferencia. |
| `source_licence` | CC BY 4.0, OGL v3.0, public-domain, written-permission, manual-curation, NONE | Obligatorio para publicar. |

### Jerarquía decisión primero
Orden de lectura en tarjeta/listado (obligatorio):

1. **Estado** (`internal_status`) + semántica propia (UNKNOWN distinguible)
2. **Días restantes / countdown** — solo si se cumplen **las seis** condiciones de `data-strategy §4.2` (ver §4, estado `countdown_raw`). **Nunca** en `UNKNOWN`, **nunca** en `inferred_from_cycle`. Si falla cualquiera: la zona del countdown simplemente no existe.
3. **Fecha límite + base** — mostrar `deadline_raw_text` (verbatim), siempre. Indicar base (`publisher_stated`/`inferred_from_cycle`/`unknown`). Separar deadline-beca vs deadline-admisión en detalle.
4. **Entidad/Proveedor** + Universidad (si aplica)
5. **Monto** — `amount + currency` o `No especificado`. **Nunca inventar**.
6. **Dominio fuente** (`host(source_url)`) + badge verificación (`last_verified_at` relativo)
7. **País(es) destino** (faceta, nunca decorativo)
8. **Nivel/Área** (secundarios)

Detalle invierte menor jerarquía en capas (progressive disclosure). CTA principal: **Ir a fuente oficial**.

## 4. Estados UI: Loading/Empty/Error/Success/Partial/Skeletons + datos (UNKNOWN, demo, envejecido>14d, needs_review, sin resultados)

### Estados globales
| Estado | Cuándo aparece | Copy/UI | Acciones |
|---|---|---|---|
| **Loading** | Fetch inicial/lista | Spinner sutil + texto "Buscando becas verificadas…" | Evitar layout shift. |
| **Skeletons** | Carga lista/detalle | Skeleton de tarjeta con campos de decisión primero (estado, fecha, entidad). | Usar para reducir percepción de espera. |
| **Empty** | Sin resultados (zero-results) | "No encontramos becas con esos filtros. Prueba con menos filtros o revisa la fuente oficial." **Sin ensanchar filtros en silencio.** | Mostrar filtros activos + sugerencia honesta. |
| **Error** | Fetch fallido/5xx | "No pudimos verificar ahora. Puedes revisar directamente en la fuente oficial." + botón retry. | Retry con backoff. No cambia fallo a CLOSED. |
| **Success** | Datos cargados válidos | Render normal con metadata confianza. | — |
| **Partial** | Campos incompletos pero publicables | Badge sutil "Información parcial" + mostrar `No publicado`/`No especificado` explícito. | No oculta huecos. |

### Estados de datos (semánticos, no decorativos)
| Estado de dato | Visual | Copy | Reglas |
|---|---|---|---|
| **`UNKNOWN`** | Badge propio (distinto de CLOSED). **Nunca gris, nunca adyacente a CLOSED**. Sin color-dependencia única. | *"No verificable ahora · Última verificación: hace N días"* + motivo legible (`status_reason`). Enlace a fuente oficial. | Countdown **nunca**. `preserveLastKnown=true`. Focus visible. |
| **`demo`** (`is_demo=true`) | Badge visible "Demo" permanente. Nunca mezclado con real. | Explicito en ítem. | Jamás se publica; solo visible en entornos demo/staging. |
| **Envejecido >14d** | Badge "Envejecido (>14 días sin verificar)" o indicador sutil por registro/fuente. | "Esta información lleva más de 14 días sin verificarse. Consulta la fuente oficial." | Visible (no oculto). Alimenta M4. |
| **`needs_review`** | Indicador interno/visible según contexto (cola). En público no oculta, pero marca ítem para revisión. | "En revisión" (interno) o no expuesto públicamente salvo correcciones. | No bloquea lectura honesta si publicable; encola vía "Report a correction". |
| **Sin resultados** | Empty honesto | "Sin resultados con tus filtros. Reduce filtros o consulta directamente la fuente oficial." | **Nunca** ensancha filtros automáticamente. |
| **`inferred_from_cycle` (deadline)** | Indicador "Fecha estimada según el ciclo del programa". Fecha visible, **sin countdown**. | "Fecha estimada según el ciclo del programa" | **Sin countdown** (`data-strategy §4.4`): "3 días" sobre un estimate nuestro es una afirmación que no podemos respaldar. El registro se usa para ordenar/agrupar, no para contar días. |
| **Fecha ambigua en la fuente** (`deadline_date_order = NULL`) | Copy explícito, sin fecha inventada. | **"Fecha límite ambigua en la fuente"** + enlace a la fuente oficial | El registro queda sin `deadline_at` y con `needs_review` (`§4.6` caso 3). La UI **no** adivina `DMY`/`MDY`. |
| **Sin deadline** (`deadline_at IS NULL`) | Línea de fecha con copy explícito. | **"Fecha límite: No publicada"** | Sin countdown. No es lo mismo que "fecha ambigua" ni que deadline pasado. |
| **`countdown_raw = NULL`** (cualquiera de las 6 condiciones falla) | **El countdown no se renderiza.** No hay placeholder, no hay "0 días", no hay guion. | (sin copy) | `0` no existe como salida: o hay intervalo o `NULL` (`§1.17`). Un countdown degradado a 0 es el bug de R6. |
| **`cycle_label`** (Chevening 2026 vs 2027) | Etiqueta de ciclo junto al título/fecha. | `2026-2027`, `Call 2027` | Sin `cycle_label` el usuario ve "Cierra en 45 días" sobre un ciclo ya vencido (`§5.3`). Chevening 2026 ≠ 2027 aunque el título coincida. |
| **`coverage[]` / `amount` ausentes** | Celda con copy explícito, nunca celda vacía. | "No especificado" / "No publicada" | La tarjeta es más pobre que la fuente si se omiten, pero **más pobre es correcto; vacío es ambiguo** (`§9`). |

**Regla crítica:** estados semánticos usan **texto + forma + icono opcional** (no solo color). WCAG 2.2 AA.

### El countdown: 6 condiciones y cómo se calcula

El countdown se implementa en el read-model (`countdown_raw`, `data-strategy §1.17`), no se recalcula a mano en el cliente. La capa de presentación recibe `countdown_raw` + `deadline_tz` + zona del lector y produce `countdown_label` + `countdown_tone`.

| # | Condición | Consecuencia en UI |
|---|---|---|
| 1 | `internal_status IN ('OPEN','UPCOMING')` | Nada si `CLOSED`/`EXPIRED`/`PAUSED`/`UNKNOWN` |
| 2 | `deadline_at IS NOT NULL` | Nada → "Fecha límite: No publicada" |
| 3 | `deadline_basis = 'publisher_stated'` | **`inferred_from_cycle` y `unknown` → nada** |
| 4 | `deadline_precision ≠ 'UNKNOWN'` | Nada |
| 5 | `deadline_at > now()` | Nada. **Nunca "0 días" ni "-2 días"** |
| 6 | `is_published AND is_demo = false AND deleted_at IS NULL` | Nada |

**Granularidad (la fija `deadline_precision`, nunca la zona del lector):**

| `deadline_precision` | Conteo | Ejemplo |
|---|---|---|
| `MINUTE`/`HOUR` | **Horas completas** hacia el instante absoluto. Nunca días. | Chevening `6 oct 11:00 UTC` → "Cierra en 2 días 6 h" |
| `DATE` | **Días naturales** hasta el fin de ese día **en `deadline_tz`** | Erasmus `15/10/2026` → "Cierra en 3 días" / "Cierra mañana" |
| `UNKNOWN` | Sin countdown | — |

**Formato de salida: siempre tres elementos, sin excepción.**

```
2 días 6 h · 6 oct 2026, 11:00 UTC (6:00 en tu hora) · "6 October 2026, at 11:00 (UTC)"
```

- El conteo usa la zona de la fuente; la zona del lector sirve **solo** para la etiqueta relativa ("hoy"/"mañana"), comparada contra `deadline_tz` para que dos lectores no vean dos verdades incompatibles.
- `deadline_precision = DATE` → **nota obligatoria y visible** (no es un supuesto silencioso):
  > *La fuente indica "15 de octubre de 2026" sin hora específica. Tomamos como cierre el final de ese día.*
- A las 23:30 del día 15 → **"Cierra hoy"**, nunca "0 días".
- Dígitos con `tabular-nums`; nunca fuente principal para un dato numérico.

> ⚠️ **Nota de consistencia para @backend/@frontend:** el pseudo-SQL de `v_scholarships_public` (`data-strategy §1.17`) filtra solo `deadline_basis = 'unknown'`, mientras que `§4.4` prohíbe el countdown también para `inferred_from_cycle`. **La regla operativa es `publisher_stated`**: el read-model debe filtrar `inferred_from_cycle` también, o la UI mostraría "3 días" sobre un estimate nuestro. Conviene confirmarlo antes de implementar.

## 5. Wireframes low-fi (descripción + estructura)

Todos low-fi descriptivos (sin código). Estructura, jerarquía, zonas, no estilos visuales detallados.

### `/` — Home (search-first)
**Propósito:** búsqueda funcionando con datos reales. Sin hero genérico.

| Zona | Elementos | Jerarquía |
|---|---|---|
| Header | Logo + "Becas verificables" + enlace `/metodologia` | Minimal. |
| Search | Campo único "Buscar becas (título, entidad, universidad)" + CTA "Buscar". Placeholder honesto. | **P0** (decisión). |
| Transparency strip | Frescura/M4 o "X% verificadas en últimos 14 días" (solo si datos reales). Nunca inventado. | Confianza. |
| Results preview (opcional) | 3–6 tarjetas con variables decisión primero (si hay resultados). | Acción rápida. |
| Empty state (home vacío) | Explica cobertura real (no "millones"). | Honesto. |
| Footer | Enlaces `/fuentes`, `/metodologia`, disclaimer breve. | Legal. |

### `/scholarships` — Listado + filtros
| Zona | Elementos | Jerarquía |
|---|---|---|
| Toolbar búsqueda | Query persistente + filtros (nivel, área, país, financiación, ventana deadline, estado). | P0. |
| Filtros | Facetas checkbox/radios. Contadores solo si sustentados (no inflados). | Decisión. |
| Resultados (lista) | Tarjetas verticales móvil-first. Cada tarjeta: estado + `cycle_label` + countdown (condicional) + fecha límite+base + entidad + monto+`No especificado` + dominio fuente + `last_verified_at`. | **Decisión primero**. |
| Orden | Relevancia (FTS) + deadline asc (**solo registros con countdown real**, `publisher_stated`) + fecha verificación desc. | Utilidad. |
| Empty | Zero-results honesto + sugerencias. | Transparente. |
| Estado barra | Frescura global (M4) sutil o no mostrado. | Confianza. |

### `/scholarships/[slug]` — Detalle
| Zona | Elementos | Jerarquía |
|---|---|---|
| Header ítem | Título, **ciclo (`cycle_label`)** junto al título, proveedor/universidad, `duration_months`/`ects` si existen. | Identidad + anticolisión de ciclos. |
| Estado + confianza | Badge estado (UNKNOWN propio), `last_verified_at` relativo, motivo UNKNOWN (`status_reason`, reescrito a lenguaje llano). **No** mostrar `status_confidence` (HIGH/MEDIUM/LOW): es metadato de diagnóstico. | **P0 (confianza)**. |
| Fechas | Bloque de 3 líneas: **countdown** (condicional, §4) + fecha absoluta con `deadline_tz` y hora del lector + `deadline_raw_text` verbatim + nota si `precision = DATE`. Badge de base si `inferred_from_cycle`; copy "Fecha límite ambigua en la fuente" si `deadline_date_order = NULL`; "Fecha límite: No publicada" si no hay deadline. Separación **deadline-beca vs deadline-admisión** (obligatorio). | P0 (riesgo). |
| Financiación | Tipo, monto+moneda o `No especificado`, cobertura[]. | Decisión. |
| Clasificación | Nivel, modalidad, fields[], duración/ECTS. | Decisión. |
| Fuentes | **CTA "Ir a fuente oficial"** prominente (primario). `source_name`, `source_url`, `source_licence`, `discovered_via`. | **P0 (source-of-truth)**. |
| Datos faltantes | Sección "Información publicada" mostrando `No publicado` explícito donde falta. | Honestidad. |
| Acciones | Añadir/quitar shortlist anónima + "Reportar corrección". | Acción. |
| Provenance | `Verificado: hace N días` visible, nunca oculto. | Confianza. |

### `/shortlist` — Shortlist anónima
| Zona | Elementos | Jerarquía |
|---|---|---|
| Header | "Mi shortlist" + contador (solo si >0 y sustentado). Título del ítem + `cycle_label` + **estado** (una shortlist es una lista de *verificaciones*, no solo de nombres). | Claro. |
| Lista | Misma estructura de tarjeta (decisión primero). Sin PII. Nota opcional por ítem, **máx. 500 caracteres** (`CHECK char_length(note) <= 500`). | Coherente. |
| Acciones | "Copiar enlace para compartir" → enlace de solo lectura con `share_slug` aleatorio (≥128 bits) y **`expires_at` obligatorio**: la UI debe mostrar la caducidad y el estado "enlace caducado". Exportar CSV/imprimible (post-MVP S4). | Utilidad U4. |
| Empty | "Tu shortlist está vacía. Añade becas desde los resultados." | Guía honesta. |
| Enlace caducado/válido | Empty dedicado: "Este enlace de shortlist ya no está disponible. Pide a quien lo comparte uno nuevo." | Honesto, sin 404 seco. |

### `/metodologia` — Metodología pública
| Zona | Elementos | Jerarquía |
|---|---|---|
| Intro | Promesa verificable ("admitimos lo que no sabemos"). | Confianza. |
| Métricas | M3–M7 en tiempo real (read-model, excluye `is_demo`): % con source_url, frescura 14d (M4), UNKNOWN accionables (M5), duplicados (M6), éxito sync (M7). | **Transparencia**. |
| Cobertura | Registros reales, países, dominios fuente distintos, último run. | Cobertura honesta. |
| Qué significa "verificado" | Explicación clara. | Educación confianza. |
| Qué NO afirmamos | Lista explícita (no garantizamos, no afiliados, cobertura parcial). | Honestidad. |
| Fuentes | Enlace a `/fuentes`. | Trazabilidad. |

### `/fuentes` — Fuentes y atribución
| Zona | Elementos | Jerarquía |
|---|---|---|
| Por fuente | Tabla/lista: nombre, dominio oficial, licencia, URL términos, fecha revisión, volumen registros, descubierto vía. | Legal. |
| Política | Denylist agregadores (studyineurope.eu etc.), cuándo no automatizar (DAAD/uni/Fulbright). | Transparencia. |
| Atribución | CC BY 4.0 cuando aplica + indicación cambios. | Cumplimiento. |
| Disclaimer | No afiliación, información con fines informativos, consultar siempre fuente oficial. | Obligatorio. |

## 6. Microinteracciones: debounce búsqueda, filtros, recovery, countdown condicionado, reduced motion, focus

Reglas: motion con **función** (orientación/feedback/transición de estado), nunca decorativo. Respeta `prefers-reduced-motion`.

| Microinteracción | Trigger | Comportamiento | Duración/Timing | Función |
|---|---|---|---|---|
| **Debounce búsqueda** | Teclado en input | Espera 250–350ms tras última tecla antes de buscar. Cancela si sigue escribiendo. | 250–350ms | Reduce requests, evita flicker, respeta fair-use. |
| **Filtros (facetas)** | Toggle checkbox | Aplicación con debounce ligero (150ms máx.) o inmediata con transición sutil. URL actualiza sin reload completo. | 150–200ms | Feedback claro de cambio de resultados. |
| **Skeleton → resultados** | Datos llegan | Transición cross-fade sutil (fade in) evitando salto layout. | 150–250ms | Reduce percepción carga, no distrae. |
| **Focus management** | Modal/flujo, errores | Focus visible obligatorio. Tras error de formulario/búsqueda mueve focus a primer error o resultados. | Inmediato | Accesibilidad keyboard-first. |
| **Recovery (retry)** | Error fetch | Botón retry con animación mínima (spin sutil) + backoff exponencial con jitter. **Nunca convierte fallo a CLOSED**. | Backoff (1s,2s,4s…) + jitter | Preserva `UNKNOWN` + `last_known_status`. |
| **Countdown** | Render ítem/detalle | Renderiza **solo si `countdown_raw` no es `NULL`** (las 6 condiciones, §4). Nunca en `UNKNOWN` ni en `inferred_from_cycle`. Formato de 3 elementos (relativo · absoluto con zona de fuente y del lector · verbatim). `tabular-nums`. Para `MINUTE`/`HOUR` tick por minuto; para `DATE` el valor es constante por día y **no necesita tick** (solo recalcular al cambiar de día en `deadline_tz`). | 60s (solo MINUTE/HOUR) | J1 sin inventar base. Cero parpadeo. Respeta reduced motion (sin tick animado). |
| **Shortlist toggle** | Click añadir/quitar | Feedback success sutil (check/fade) sin salto. Persistido token anónimo. | 100–150ms | Refuerza acción sin fricción. |
| **Clic fuente oficial** | Hover/focus CTA | Estado focus visible claro (outline AA). `rel="noopener noreferrer"`. | Instantáneo | Guía a source-of-truth. |
| **Reduced motion** | `prefers-reduced-motion: reduce` | Desactiva transiciones/animaciones no esenciales. Countdown sigue legible (sin tick animado). Skeleton fade reducido o instantáneo. | 0ms | Accesibilidad. |

## 7. Accesibilidad WCAG 2.2 AA

Obligatorio por construcción (building-accessible-interfaces).

| Criterio | Requisito | Aplicación práctica |
|---|---|---|
| **Keyboard navigation** | Navegable 100% por teclado (Tab, Shift+Tab, Enter, Space, Esc, Arrow). | Menús/filtros, shortlist, enlaces, CTA fuente oficial. Focus visible en todos elementos interactivos. |
| **Focus visible** | Focus ring contrastado ≥3:1 vs fondo. Nunca eliminado. | Inputs, botones, enlaces, checkboxes, tarjetas clicables. |
| **Contraste color** | Texto normal ≥4.5:1, texto grande ≥3:1, UI no-texto ≥3:1. | Estados (OPEN/CLOSED/UPCOMING/EXPIRED/PAUSED/UNKNOWN). **UNKNOWN distinguible sin depender solo color**. |
| **Touch targets** | ≥44×44px (mínimo). Espaciado suficiente entre elementos táctiles. | Tarjetas, botones móvil (U1). |
| **Screen readers** | Labels ARIA correctos, live regions para estados dinámicos (loading/error/success). | Badges estado con `aria-label` descriptivo (incluye motivo UNKNOWN). `last_verified_at` anunciado. Countdown solo cuando presente. |
| **Semántica HTML** | Landmarks (main/nav/aside/footer), headings jerárquicos, listas correctas. | Listado resultados `<ul>/<li>`, detalle estructura lógica. |
| **Reduced motion** | Respetar `prefers-reduced-motion: reduce`. | Desactivar animaciones no esenciales (§6). |
| **Idioma/legibilidad** | `lang` correcto. Texto legible, densidad razonable móvil-first. | Sin truncado que oculte información crítica (deadline/source). |
| **Estados no-color** | Icono+texto+forma para estados semánticos. | UNKNOWN/CLOSED nunca solo color. |
| **Enlaces externos** | Anunciar destino externo + `rel="noopener noreferrer"`. | CTA fuente oficial. |

## 8. Responsive mobile-first (listado prioritario)

Mobile-first. Listado es superficie de mayor uso (U1).

| Breakpoint | Layout | Decisiones clave |
|---|---|---|
| **< 480px (mobile)** | 1 columna. Tarjetas apiladas vertical. Filtros colapsados (drawer/accordion). | Deadline legible **a brazo largo**. Touch ≥44px. Listado densidad legible. Search prominente arriba. |
| **480–768px (large mobile/tablet small)** | 1 columna, filtros opcional sidebar colapsable. | Mantiene jerarquía decisión primero. Espacio suficiente para badges. |
| **768–1024px (tablet)** | 2 columnas (filtros izquierda + listado derecha). Detalle layout vertical. | Aprovecha ancho sin diluir confianza. |
| **≥1024px (desktop)** | 3 columnas opcional (filtros + listado + preview detalle) o 2. Detalle full. | U2–U4 priorizan comparación/lectura profunda. |

**Reglas responsive:**
- **Listado prioritario** (mobile-first). Variables decisión primero nunca reordenadas para perder jerarquía.
- Evitar horizontal scroll. Texto deadline no truncado de forma que oculte base/fecha.
- Skeletons mantienen alturas estables (evitan layout shift).
- Zero-results/Empty mantienen legibilidad en móvil estrecho.

## 9. Decisiones: search-first, sin login, shortlist anónima, sin contador inflado

| Decisión | Fundamento (fuente) | Implementación UX |
|---|---|---|
| **Search-first (no globe-first)** | `discovery §2.1, D1, ADR-001`. Globo requiere 4 criterios medibles y post-MVP. Lookup preciso (búsqueda) > exploración 3D decorativa. | Home centrado en búsqueda única funcionando con datos reales. Sin hero decorativo. Rutas `/`, `/scholarships` núcleo. |
| **Sin login (MVP)** | `discovery D5, §3.1.6`. Fricción cero (U1). Shortlist cubre caso de uso sin identidad. | Shortlist 100% anónimo. Token hash en cliente/BD, ownership por token. URL compartible solo lectura. Sin auth flows. |
| **Shortlist anónima** | `discovery §3.1.6, RF-5`, `data-strategy §1` (`user_scholarships`). No PII. URL compartible de solo lectura. | Añadir/quitar por token; `token_hash` es la frontera de ownership (anti-IDOR). Página `/shortlist` + share con `share_slug` y caducidad. Nota por ítem con `CHECK` de 500 caracteres. |
| **Sin contador inflado** | `discovery §9.5`. "Números aparecen solo si los podemos sustentar". Cero "10.000+ becas" inventadas. | Contadores (resultados, países, fuentes) solo si calculados desde datos publicados reales (excluye `is_demo`). Métricas metodología desde read-model. |
| **Fuente oficial prevalece** | `discovery §0 regla 1, §5.3`. Agregadores solo descubrimiento. | CTA primario "Ir a fuente oficial" prominente en detalle. `source_url` nunca apunta a agregador (denylist). |
| **UNKNOWN nunca tratado como CLOSED** | `discovery §4.5, ADR-002`. | Badge propio, sin gris/adyacente, copy específico, countdown desactivado. |
| **Countdown solo con base declarada por la fuente** | `discovery §4.4`, `data-strategy §4.2–4.4` (DS-04/DS-05), R6. Las **seis** condiciones, siendo la 3 `deadline_basis = 'publisher_stated'`. | Lógica condicional estricta en read-model (`countdown_raw`, §4). Nunca en UNKNOWN ni en `inferred_from_cycle`. Muestra los 3 elementos: relativo, absoluto con zona, verbatim. |
| **Datos + enlace, no prosa copiada** | `discovery D8`. | Muestra hechos + enlace oficial. `No publicado` explícito. Sin descripciones largas copiadas. |
| **Demo siempre etiquetado, nunca mezclado** | `discovery D7, §9.11`. | Badge "Demo" visible. Filtros/publicación excluyen `is_demo`. |
| **Provenance obligatoria para publicar** | `discovery §4.2, ADR-004`. | UI muestra `last_verified_at` SIEMPRE en zona usuario (detalle + tarjetas). Sin él, registro no aparece. |
| **Honestidad zero-results** | `value-impact §5.2`, `discovery §9.4`. | Copy honesto, sin ensanchar filtros en silencio. Sugiere fuente oficial. |

## 10. Qué NO utilizar

Evitar para no volver genérico o innecesariamente complejo (anti-AI-slop):

| Evitar | Razón | Alternativa honesta |
|---|---|---|
| **Hero genérico** (titular vacío + CTA genérico) | Oculta datos reales, vende promesa no sustentada (`discovery §9.8`). | Home con búsqueda funcionando + datos reales. |
| **Globo 3D / WebGL decorativo en MVP** | Riesgo alto, lookup peor, sugiere cobertura total con parcial (`discovery §2.1, ADR-001`). | **Coropleta 2D** o facetas si se cumple evidencia (post-MVP con 4 criterios). |
| **Purple→blue gradients, glassmorphism gratuito, blobs decorativos** | Decoración sin función (`discovery §9.6`). | Superficies planas, un solo acento semántico (por estado/acción). Tipografía+espacio sobre efectos. |
| **Cards para absolutamente todo / grids perfectamente simétricos** | Genérico, diluye jerarquía confianza (`discovery §9.6`). | Asimetría intencionada donde aporta claridad. Jerarquía decisión primero guía composición. |
| **Contadores inflados ("10.000+ becas")** | No sustentados (`discovery §9.5`). | Métricas reales (M3–M7) en `/metodologia`. |
| **Animaciones decorativas sin función** | Añaden complejidad (`discovery §9.7`). | Solo motion con función (§6). Respeta reduced motion. |
| **Inter/Roboto/system-ui automático** | No justificado visualmente (`discovery §9.7`). | Tipografía con razón (jerarquía+legibilidad). Escala tipográfica real. |
| **Banderas/fotos campus como decoración** | Engaña sobre cobertura (`discovery §9.2`). | Solo geografía de datos (coropleta). |
| **Dashboard SaaS genérico** (3 cards features hero) | No refleja JTBD verificable (`discovery §9.8`). | UX centrado en búsqueda+detalle+fuente oficial. |
| **Inferir CLOSED por timeout/404** | Viola D4/ADR-002 (`discovery §4.3`). | `UNKNOWN` + preservar `last_known_status`. |
| **Countdown sobre `inferred_from_cycle`** | "3 días" sobre un estimate nuestro es una afirmación no respaldada (R6, `§4.4`). | Fecha + badge "Fecha estimada según el ciclo del programa". |
| **"0 días" o "-2 días"** | Es el bug de R6: el usuario lo lee como "cerró". Un countdown degradado a 0 es exactamente el daño. | Si `countdown_raw` es `NULL`, no se renderiza nada. |
| **Mostrar HIGH/MEDIUM/LOW al usuario** | `status_confidence` es metadato de diagnóstico; "HIGH" sobre un `UNKNOWN` se lee como "alta confianza" y es lo contrario de la verdad. | Traducir `status_reason` a lenguaje llano. |
| **Ocultar `cycle_label`** | Chevening 2026 y 2027 tienen el mismo título; sin ciclo, el countdown apunta a la convocatoria equivocada. | Etiqueta de ciclo en tarjeta y detalle. |
| **Mezclar demo/real silenciosamente** | Viola D7 (`discovery §9.11`). | Badge demo obligatorio. |

## 11. Métricas de valor/impacto (cómo comprobar si funcionan las decisiones)

Alineadas con `discovery §7` (M1–M8). Exclusivamente first-party, calculables desde BD+PostHog.

| # | Métrica | Definición | Umbral (MVP) | Cómo medir (UX) |
|---|---|---|---|---|
| **M1** | Search-to-action | (Sesiones con ≥1 búsqueda → llegan a detalle → clic fuente oficial) / sesiones con búsqueda | ≥40% | Funnel: `search_submitted → detail_viewed → source_outbound_click`. |
| **M2** | Zero-result rate | Intenciones búsqueda distintas con 0 resultados / total | ≤10% (top-20 intenciones) | `search_events.intent_key` (normalizado, sin PII). |
| **M3** | Tasa fuente verificable | Publicados con `source_url` resoluble en dominio oficial / publicados | **100%** (por construcción CHECK DB) | SQL + restricción bloqueante. UI refuerza con enlace prominente. |
| **M4** | Frescura de estado | Publicados con `last_verified_at` ≤14 días / publicados | ≥80% (alerta <60%) | Por fuente + global. Expuesto en `/metodologia`. Badge envejecido >14d visible. |
| **M5** | `UNKNOWN` en accionables | `internal_status='UNKNOWN'` con `source_status IN (OPEN,UPCOMING)` / total que afirman abiertos | ≤5% | Cohorte crítica. Medir clics desde UNKNOWN a fuente (validación R7). |
| **M6** | Tasa duplicados | Publicados en `duplicate_group_id` con >1 miembro / publicados | ≤2% | Higiene corpus. No afecta UX visible salvo transparencia. |
| **M7** | Éxito de sync | Fetches parseables + estado reconocido / intentos (7d, por fuente) | ≥90% (alerta <70% 3d) | Salud datos. Expone metodología. |
| **M8** | Usuarios que regresan | Usuarios ≥2 sesiones 14d / ≥1 sesión | ≥25% | First-party (privacidad). No requiere login. |

**Notas:** No métricas vanity (conteo registros/pageviews/shares). Outcomes reales (admisiones) no medibles sin PII (trade-off explícito). Las decisiones UX se validan por **M1 + M5 + comportamiento clic fuente desde UNKNOWN**.

## 12. Brief para @frontend

Especificación accionable (sin código). @frontend debe implementar siguiendo estas directrices.

### Dirección visual
- **Concepto:** Technical + Editorial (híbrido coherente). Prioriza claridad/trazabilidad sobre tendencia. Evita cinematic/glow innecesario.
- **Personalidad:** Honesta, precisa, tranquila, cercana-profesional. Transmite confianza (no arrogancia), útil (no decorativo).
- **Lenguaje visual:** Datos-first. Superficies neutras, jerarquía tipográfica fuerte, espacio negativo generoso. Geografía solo coropleta.
- **Identidad:** Reconocible por **metadata de confianza + variables decisión primero + comportamiento (enlace fuente prominente)**. Si se elimina logo/nombre, aún reconocible por jerarquía.

### Sistema de diseño
| Ámbito | Especificación | Razón |
|---|---|---|
| **Tipografía** | Escala modular real (display/body). Fuente con excelente legibilidad móvil. Evitar elección automática; justificar si usa system-ui/Inter. Usar `tabular-nums` para fechas/countdown. | Legibilidad U1 + fechas precisas (R6). |
| **Color** | 1 acento reservado acción/énfasis. Estados semánticos por color+texto+forma. Superficies/texto neutros. Evitar purple→blue, gradients, glass gratis. | `discovery §9.6`. Accesibilidad (no solo color). |
| **Formas** | Border radius sobrio, bordes sutiles. Sin redondeo excesivo uniforme forzado. Profundidad mínima (sombras funcionales solo cuando aportan jerarquía). | Coherente, no genérico. |
| **Espaciado** | Sistema 4pt/8pt consistente. Densidad legible móvil-first (listado). Espacio negativo para respiración. | Legibilidad + jerarquía. |
| **Iconografía** | Funcional (no decorativa). Estilo lineal/simple, coherente. | Claridad. |

### Componentes principales
| Componente | Props/behaviour requerido | Estados obligatorios | Notas |
|---|---|---|---|
| **SearchInput** | Debounce 250–350ms. Mantiene query URL. | default/hover/focus/active/loading/empty/error | Search-first núcleo. |
| **ScholarshipCard (listado)** | Renderiza jerarquía decisión primero (§3). Countdown condicional estricto. Muestra `No especificado`/dominio+`last_verified_at`. | default/hover/focus/loading | Tarjeta móvil-first. Nunca oculta base deadline. |
| **StatusBadge** | 6 estados. **UNKNOWN propio** (nunca gris/adyacente CLOSED). Sin solo color. Incluye `aria-label`. | default | Semántico + accesible. |
| **Countdown** | Consume `countdown_raw` del read-model (no recalcular). Render solo si no es `NULL`. 3 elementos (relativo · absoluto con `deadline_tz` + hora del lector · verbatim). `tabular-nums`. Nota obligatoria si `precision = DATE`. | default/expired/none | Solo `publisher_stated`. **Nunca UNKNOWN ni `inferred_from_cycle`**. `MINUTE`/`HOUR` en horas; `DATE` en días naturales. |
| **DeadlineBlock** (detalle) | Countdown + fecha absoluta + `deadline_raw_text` + base + nota + ambigüedad. | deadline/ambiguous/missing/inferred | Las 4 variantes de copy de §4. Separar deadline-beca vs deadline-admisión. |
| **SourceProvenance** | Muestra `source_name`, dominio, `source_url` (oficial), `source_licence`, `last_verified_at` relativo. CTA primario "Ir a fuente oficial". | default | Confianza primero (P0 detalle). |
| **EmptyState** | Zero-results honesto. Sin ensanchar filtros. | empty | Copy transparente. |
| **SkeletonCard** | Mantiene altura estable. Estructura decisión primero. | loading | Evita layout shift. |
| **ShortlistToggle** | Anónimo (`token_hash`). Nota opcional ≤500 chars. Feedback sutil. | default/active/success | Sin login. |
| **ShareLink** | `share_slug` aleatorio (≥128 bits), solo lectura, `expires_at` visible. | valid/expired | Enlace caducado con empty dedicado, no 404. |
| **BadgeDataState** | demo/envejecido>14d/needs_review/partial/cycle_label. Texto+forma. | default | Estados datos (§4). |

### Comportamiento
- **Search-first:** ruta `/scholarships` resultado inmediato con debounce.
- **Source-of-truth:** enlace fuente oficial prominente, abre en nueva pestaña con `rel="noopener noreferrer"`.
- **Unknown conservador:** fallo → `UNKNOWN`, preservar `last_known_status`, mostrar motivo + retry.
- **Progressive disclosure:** lista decisión primero, detalle capas secundarias.
- **Zero-results honesto:** sin auto-expand filtros.
- **Shortlist anónimo:** `token_hash` (SHA-256; el token en claro solo viaja en la URL compartida, nunca se almacena), enlace de solo lectura con `expires_at`, sin PII.
- **`cycle_label` siempre visible** en tarjeta y detalle: sin él, dos ciclos del mismo programa se leen como uno y el countdown apunta al ciclo equivocado.

### Estados (obligatorios globales)
Cubrir: default, hover, focus, active, loading, empty, error, success, partial, disabled, offline, processing. Especialmente UNKNOWN/demo/envejecido/needs_review/ambiguous deadline/share caducado.

### Motion
- Funcional únicamente (§6). Duraciones 100–350ms máx. Easing sutil.
- **Reduced motion** estricto (prefers-reduced-motion: reduce) → 0ms transiciones no esenciales.
- Countdown sin animación decorativa; el número es texto, no un elemento animado.

### Restricciones
- **Sin `dangerouslySetInnerHTML`** sobre contenido de fuentes (hard rule `security §2.1`).
- **Cero invención de datos**: `No especificado`/`No publicada` explícito. Nunca rellenar silenciosamente.
- **Countdown solo con `deadline_basis = publisher_stated`**. Prohibido en `UNKNOWN`, en `inferred_from_cycle` y en base `unknown`.
- **Nunca "0 días" ni negativo**: si `countdown_raw` es `NULL`, no se renderiza nada (no un placeholder, no un guion).
- **No exponer `status_confidence`** (HIGH/MEDIUM/LOW) como etiqueta de usuario: es metadato de diagnóstico. Traducir `status_reason` a lenguaje llano en su lugar.
- **`deadline_tz` debe llegar al cliente**: sin él el usuario ve una hora que no reconoce y no puede auditar el countdown.
- **Contenido externo siempre como texto sanitizado**; solo allowlist de etiquetas; nada de HTML de terceros.
- **Demo nunca mezclado**: badge visible + exclusión de filtros y métricas.
- **`source_url` nunca apunta agregador** (denylist `legal-matrix`).
- **Sin login/auth UI en MVP**; sin contadores globales no sustentados.

### Accesibilidad
WCAG 2.2 AA (§7): keyboard completo, focus visible, contraste, touch ≥44px, live regions, ARIA correcto, semántica, reduced motion, no solo color.

### Responsive
Mobile-first, listado prioritario (§8). Jerarquía decisión primero inmutable entre breakpoints. Deadline legible brazo largo.

### Firma visual
Elemento reconocible: **jerarquía de metadata de confianza (estado + base deadline + dominio fuente + `last_verified_at`) como eje compositivo principal**. Composición editorial (ritmo+espacio negativo) + asimetría intencionada. Si logo/nombre eliminado, experiencia sigue identificable por este orden y comportamiento (fuente oficial prominente).

**Brief listo para implementación. Sin código.**
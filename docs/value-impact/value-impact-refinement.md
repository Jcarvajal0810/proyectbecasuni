# FASE 2 - Value/Impact Refinement


> **Fuentes de verdad leídas íntegro:** `docs/discovery/discovery.md` (430 l.), `docs/architecture/architecture.md` (1212 l.), `docs/discovery/value-impact.md`, `legal-matrix.md`, `security-baseline.md`.
> **No introduce requisitos nuevos.** Cada ítem traza a `discovery §…`, `legal-matrix §…`, `security-baseline §…` o `architecture §…`. Donde hay que fijar un número que el repo no fija, está marcado 🔶 INFERENCIA con su base. Donde el repo se contradice a sí mismo, está en §8 ANEXO y marcado ⚠️ ABIERTO.
> **Restricciones respetadas:** sin código de aplicación, sin inventar requisitos, sin datos, licencias ni umbrales sin respaldo.

**Leyenda de estado de evidencia**

| Marca | Significado |
|---|---|
| ✅ **VERIFICADO** | Comprobado contra fuente viva o explícito en repo (fecha 2026-09-30) |
| 🔶 **INFERENCIA** | Derivado razonado de evidencia del repo; el número o umbral es **propuesta**, no hallazgo |
| ⚠️ **ABIERTO** | Sin resolver. Requiere decisión del usuario o de otra fase |

**Rol de "quién verifica"** (leyenda):

| Sigla | Rol | Nota |
|---|---|---|
| **PROD** | Producto / usuario owner | Decide go/no-go y umbrales |
| **LEG** | Legal | Veredicto de licencia, clearance, copy |
| **SEC** | Seguridad | SSRF, auth, serialización, CI |
| **DATA** | `@database` / Fase 4 | Schema, CHECK, queries, migraciones |
| **BACK** | `@backend` / Fase 7 | Pipeline, contratos, tests |
| **CUR** | Curador humano con nombre | Crea y re-verifica registros |
| **DES** | Diseño / Fase 6 | Copy, jerarquía visual, accesibilidad |
| **QA** | Calidad / Fase 8 | Evidencia de DoD, drills |

---

## 0. Una tesis de valor, en una frase verificable

`discovery §0` sostiene que el problema real es **verificar**, no descubrir. Eso impone una consecuencia que atraviesa todo este documento:

> **El único activo del producto es el corpus curado + su trazabilidad.** La arquitectura, el motor de estado y la honestidad del copy son *lo que impide que ese activo se degrade*. Cualquier trabajo que no proteja el activo (verificabilidad de `source_url` + `last_verified_at`) es trabajo sin retorno, porsteht—, aunque parezca Crusade de producto.

Corolario operativo que este documento fija y que es la razón de §1 y §5: **un solo registro con un estado falso confirmado cuesta más que cien registros ausentes.** La ausencia es una afirmación honesta y recuperable; el estado falso es una postulación perdida y una cuenta cerrada para siempre (`discovery §8 R3`, `value-impact §7 R3`). Por eso, en todo lo que sigue, *retirar* siempre es más barato que *adivinar*.

---

## 1. Definition of Ready (DoR)

### 1.0 Qué es y qué no es este DoR

- **DoR = qué debe ser verdad antes de escribir la primera línea de Fase 9.** Condiciones de *entrada* a la implementación. No incluyen el resultado final del producto.
- **Los300 registros NO son DoR, son DoD.** El DoR exige que el **plan** para producirlos esté resuelto, fechado y con owner (`Q1` abierta). Confundir esto convierte la curación en un bloqueo de arranque en lugar de un trabajo paralelo de ejecución.

Cada ítem: **criterio de aceptación objetivo** (un tercero puede comprobarlo sin preguntar) + **quién lo verifica** + **evidencia que queda** + **bloqueante sí/no**.

### 1.A — Corpus y curation (bloquea el arranque del pipeline de datos)

| # | Criterio de aceptación verificable | Verifica | Evidencia | Bloq. |
|---|---|---|---|---|
| A1 | Existe un **plan de curación fechado**: número de registros por fuente, ritmo semanal, fecha de arranque, horas-persona asignadas y **fecha en la que el gate `§3.2` se declara cumplido o incumplido**. Si la proyección no alcanza 300 en la fecha, hay una decisión escrita de PROD sobre bajar el gate o retrasar el lanzamiento. | PROD + CUR | Plan versionado + decisión escrita | **Sí** |
| A2 | **Fixture real archivado** del payload del feed EACEA (`node/253/rss_en`) con su `hash`, su `pubDate` de descarga y ≥1 elemento de cada colección, incluida `Legacy`. Permite tests deterministas sin red. ✅ Base: feed parseado y verificado el 2026-09-30, ~25 ítems (`architecture §1.3`). | BACK + SEC | Fichero de fixture + hash en repo | **Sí** |
| A3 | **Catálogo de ≥15 dominios fuente candidatos** con: entidad legal, URL de sus términos/licencia, URL de `robots.txt` (o "no verificable", marcado como tal), veredicto por escrito (`manual-curation` / `link-only`) y **curator asignado por dominio**. Sin dominio asignado = no se usa. | LEG + CUR | Tabla de fuentes con fecha de revisión | **Sí** |
| A4 | **Protocolo de curation firmado** (`legal-matrix §11`): campos obligatorios (`source_url` propia del programa, `source_name`, `source_licence='manual-curation'`, `discovered_via`, `curator`, `verified_at`, `fields_sourced`), **regla de dos personas para `deadline` y `amount`**, y prohibición explícita de pegar frases de terceros. | LEG + CUR | Documento de protocolo + checklist por registro | **Sí** |
| A5 | **Cadencia de re-verificación con owner y carga calculada.** Se adopta la tabla por volatilidad de `legal-matrix §11` (ciclo fijo → cada ciclo + barrido pre-deadline; rolling → mensual;kau embassy → ciclo + 2 semanas antes de cada deadline; deadline pasado → auto-expirar, nunca borrar) y **se cuantifica la carga resultante** contra la capacidad disponible. La variable "horas-persona disponibles" la fija PROD. | PROD + CUR | Tabla de cadencia con carga estimada (registros/tipo ÷ intervalo) | **Sí** |
| A6 | **Los ≥3 ciclos anuales de mayor volumen están identificados**, con fecha de apertura conocida, con el evento de calendario disparado y con persona responsable asignada. Chevening (septiembre, ✅ observado) es el test estacional natural (`discovery §3.2`). | CUR + PROD | Calendario de ciclos con owners | **Sí** |
| A7 | Definido por escrito qué hacer con un registro **no publicable**: permanece en la tabla con `is_published=false`, entra a la cola `needs_review`, **no se borra**, y no aparece en ninguna vista pública ni en el read-model de metodología. | DATA + BACK | Regla escrita + test de read-model | **Sí** |

> **Nota de honestidad (⚠️ ABIERTO → §8 C3):** `legal-matrix §11` fija "seed scope: 15–50 programas" mientras `discovery §3.2` exige ≥300 registros agregados. No son necesariamente contradictorios si 15–50 es el *tier de mayor valor* y 300 el total, pero el texto no lo dice. **PROD debe resolverlo antes de A1.**

### 1.B — Motor de estado (bloquea *toda* la lógica de dominio)

| # | Criterio de aceptación verificable | Verifica | Evidencia | Bloq. |
|---|---|---|---|---|
| B1 | **Tabla de evidencia exhaustiva y cerrada**: cada fila de la tabla de reglas de `discovery §4.3` (7 situaciones) y **cada uno de los 17 valores de `FetchOutcome`** (`architecture §8`) mapea a **exactamente un** par `{status, confidence, reason}`. Sin combinaciones ambiguas, sin valores sin mapear. | BACK | Matriz `outcome × evidencia → resultado` versionada | **Sí** |
| B2 | **Property test**: para los 17 `FetchOutcome` de fallo (`timeout`, `dns_error`, `connection_refused`, `tls_error`, `http_4xx`, `http_5xx`, `too_large`, `blocked_scheme`, `blocked_host`, `blocked_ip`, `redirect_violation`, `rate_limited`, `circuit_open`, `content_type_rejected`, `challenge_page`, `budget_exhausted`) el resultado **es `UNKNOWN` en el 100% de los casos**, con `preserveLastKnown=true`. Un solo caso que produzca `CLOSED` rompe el build. | BACK | Suite de property tests en CI | **Sí** |
| B3 | `CLOSED` solo es alcanzable con `sourceStatusEvidence` explícita de la fuente **o** con `deadlineBasis='publisher_stated'` **y** `deadline_at` vencido **y** sin contradicción de la fuente. La condición está escrita como aserción, no como intención. | BACK | Test nominal de cada ruta `CLOSED` | **Sí** |
| B4 | `OPEN` es inalcanzable desde una fecha futura sin estado explícito de la fuente. Test que itera `opening_date ∈ [now, now+2 años]` y verifica que `OPEN` es imposible. | BACK | Test paramétrico | **Sí** |
| B5 | **Semántica de `last_known_status` escrita y sin ambigüedad**: exactamente cuándo se escribe, cuándo se congela y qué NO borra nunca. Respuesta a: "si el estado verificado cambia de `OPEN` a `CLOSED`, ¿`last_known_status` se actualiza a `CLOSED` o conserva el último *no fallido*?" 🔶 INFERENCIA (el repo no lo especifica). | BACK | Especificación de 10 líneas | **Sí** |
| B6 | **Vocabulario cerrado de `status_reason`** (enum, no texto libre) con copy ES y EN por cada valor, porque se renderiza al usuario **y** alimenta la página de metodología. Ningún `UNKNOWN` puede tener motivo genérico tipo "error". | DES + BACK | Enum + tabla de copy aprobada | **Sí** |
| B7 | **Regla de countdown como función pura y tabla de decisión** completa: `deadline_basis × internal_status × deadline_at presente × tz del lector → countdown sí/no + texto`. Regla dura: `basis='unknown' → nunca`; `internal_status='UNKNOWN' → nunca`. Test negativo: ninguna combinación produce "0 días" ni un número negativo. | BACK + DES | Tabla de decisión + tests de AR-4 | **Sí** |
| B8 | `resolveStatus()` no importa `Date`, `fs`, `fetch`, `db` ni `adapters/`, y `now` entra inyectado por `SyncContext`. **Verificado en CI por lint de arquitectura**, no por convención (`architecture §6.2`, AR-12). | SEC + BACK | Regla de lint que falla el build | **Sí** |

### 1.C — Seguridad y frontera de red (bloquea cualquier código de red)

| # | Criterio de aceptación verificable | Verifica | Evidencia | Bloq. |
|---|---|---|---|---|
| C1 | **Spike ejecutado**: el runtime objetivo soporta lookup DNS propio (`undici.Agent` con `connect.lookup`) y, por tanto, **pin de IP**. Si no lo soporta → el adapter no se habilita y **no se degrada** a "validamos la IP una vez" (`architecture §10.2`). Resultado escrito. | SEC | Resultado del spike + decisión | **Sí** |
| C2 | Los **tests negativos de SSRF existen como job de CI** (no como ítem de checklist) contra: `127.0.0.1`, `10/8`, `172.16/12`, `192.168/16`, `169.254.169.254`, `100.64/10`, `::1`, `fc00::/7`, `fe80::/10` y un escenario de **DNS rebinding** (`architecture §10.2`, `security §11.2`). Fallar = no merge. | SEC | Job de CI verde en cada commit | **Sí** |
| C3 | **Registro de endpoints revisado** con exactamente **una** entrada en MVP (`eacea.ec.europa.eu`, HTTPS). Sin comodines, sin sufijos, sin regex laxas. El diff de ese fichero es el punto de revisión de SSRF. | SEC + BACK | PR review del registro | **Sí** |
| C4 | **Test de allowlist de serialización** definido como aserción de CI: ningún nombre de campo interno (`notes_internal`, `legal_clearance`, `needs_review`, `discovered_via`, `delete_reason`, `resolved_ip`, `error_class`) aparece en **ninguna** respuesta pública (`architecture §10.6`). | SEC | Test de CI | **Sí** |
| C5 | **Kill switch por fuente diseñado y probado**: un flag desactiva la fuente **sin deploy** (`legal-matrix §9` ítem 27, `architecture §7.1` `SOURCES.kill_switch`). Test: activar el flag → el run no emite fetch y los registros de esa fuente pasan a no publicarse, **sin borrado**. | BACK + SEC | Test + tiempo de corte medido | **Sí** |
| C6 | **Autenticación de endpoints internos** diseñada: token firmado HMAC con expiración, comparación en tiempo constante, **fail closed**, **sin bypass de dev en config de prod**, y **token de sync ≠ token de admin** (AR-13, `security §5.2`). | SEC | Diseño + test de firma inválida | **Sí** |
| C7 | **Shortlist sin IDOR por diseño**: ownership derivado de la sesión/token, scoping en la query, tests de privilegio horizontal en **cada** ruta. Test de User A contra User B. | SEC + BACK | Tests de IDOR | **Sí** |
| C8 | **Tensión SSRF↔Vercel resuelta por escrito** (`architecture §11.3`): Opción A con las 6 mitigaciones, u Opción C. Registrado como **riesgo aceptado**, no como detalle omitido. **Depende de Q-A del usuario.** | PROD | Decisión registrada | **Sí** |

### 1.D — Legal, provenance y copy (bloquea la publicación, no el desarrollo)

| # | Criterio de aceptación verificable | Verifica | Evidencia | Bloq. |
|---|---|---|---|---|
| D1 | Bloque `legal_clearance` completo y fechado para EACEA: `termsUrl`, `termsRetrievedAt`, **cláusula literal** (no paráfrasis), `licence='CC BY 4.0'`, `permissionArtefact` (URL de la licencia), `robotsArchivedHash`, `prohibitedUseCleared`, `trademarkCleared`, `reviewer`, `reviewedAt` (`architecture §8`, `legal-matrix §2b/§9`). ✅ Base verificada 2026-09-30; falta codificarla en el descriptor. | LEG | Descriptor con el bloque relleno | **Sí** |
| D2 | **Copy de atribución aprobado** para cada valor de `source_licence` en uso (CC BY 4.0 / manual-curation / link-only), ES + EN, con el requisito de "indicar cambios" del CC BY (`legal-matrix §10.1`). | LEG + DES | Tres variantes de copy aprobadas | **Sí** |
| D3 | **Copy de descargo de responsabilidad aprobado** con el wording obligatorio de `legal-matrix §10.3` (no afiliación · no respaldo · desactualización · no es asesoramiento · no portal de solicitudes · marcas · no garantizamos cobertura). Firmado por el usuario. | LEG + PROD | Copy aprobado | **Sí** |
| D4 | **Denylist de hosts de descubrimiento** codificada en el descriptor: agregadores y portales no oficiales confirmados (`studyineurope.eu` ✅ verificado como empresa privada, no fuente de la UE; los agregadores observados en `value-impact §1.2` F5). Un `source_url` que caiga en denylist → **cuarentena, no borrado**, con log de rechazo. | LEG + BACK | Lista + test | **Sí** |
| D5 | **Página de fuentes y atribución** con especificación de contenido: cada fuente, su licencia, URL de sus términos, fecha de revisión de esos términos y **volumen de datos por fuente** (`legal-matrix §10.2`). | LEG + DES | Spec de página | **Sí** |
| D6 | **"Report a correction"** diseñado como control compensatorio (`legal-matrix §11`: *"no es un nicety"*), con destino de la acción, no requiere cuenta y encola `needs_review`. | DES + BACK | Diseño de flujo | **Sí** |
| D7 | **`Q2` (licencia pública de Chevening) resuelta o descartada explícitamente** antes de Fase 9. Si queda `UNVERIFIED`, la decisión registrada es "permanece curación manual" y **no** seeda permiso para automatizar. | LEG | Informe fechado | **Sí** |

### 1.E — Producto y honestidad del copy (bloquea el diseño de pantalla)

| # | Criterio de aceptación verificable | Verifica | Evidencia | Bloq. |
|---|---|---|---|---|
| E1 | **Copy de `UNKNOWN` aprobado**: *"No verificable ahora · Última verificación: hace N días"* + enlace a la fuente + motivo en lenguaje llano. **Nunca gris, nunca adyacente al badge de `CLOSED`** en la jerarquía visual (`discovery §4.5`, R7). Verificable por captura de diseño revisada, no por intención. | DES | Capturas + tokens de copy | **Sí** |
| E2 | **Copy de vacío aprobado**: `No especificado` / `No publicado` como afirmación diseñada, con tratamiento visual equivalente al de un dato real (`discovery §9.4`). | DES | Spec de vacío + captura | **Sí** |
| E3 | **Copy de la página de metodología** aprobado con estructura fija: nº de registros reales · nº de fuentes · fecha del último run · qué significa "verificado" · **qué NO afirmamos**. Los números vienen del read-model, **nunca de constantes** (`D6`, `architecture §12`). | DES + DATA | Spec + fuente de cada número | **Sí** |
| E4 | **Copy de cero-resultados** aprobado: la búsqueda sin resultados lo dice honestamente y **no ensancha filtros en silencio** (`value-impact §5.2`). | DES | Copy por caso (0 con filtros / 0 sin filtros) | **Sí** |
| E5 | **Checklist de señales de estafa** redactado y colocado (`discovery §3.1.10`), sin lenguaje "garantizado" en ninguna variante de copy (`legal-matrix §10.4`). Test de copy: el grep de palabras prohibidas ("garantizado", "100% verificado", "en tiempo real", "verificado por [entidad]", "always up to date") sobre la UI devuelve cero. | LEG + DES + QA | Checklist + test de copy | **Sí** |
| E6 | **Idioma de la UI decidido.** ⚠️ El repo **no lo fija** y hay una tensión real: la FTS está configurada con `to_tsvector('spanish', …)` (`architecture AR-3`) mientras el corpus de origen es mayoritariamente inglés y las personas U2/U3/U4 operan en inglés. **Recomendación 🔶: ES + EN en bloqueo**, porque etiquetar en el idioma equivocado un dato es un problema de confianza, no de traducción. | PROD | Decisión registrada | **Sí** |

### 1.F — Medición y operación (bloquea el lanzamiento, no el desarrollo)

| # | Criterio de aceptación verificable | Verifica | Evidencia | Bloq. |
|---|---|---|---|---|
| F1 | **Contrato de eventos del funnel** definido y con revisión de privacidad: `search_submitted → detail_viewed → source_outbound_click`, `intent_key` normalizada a 120 chars sin PII, y **PostHog nunca recibe la query cruda** (`architecture §7.3`, resolución de la tensión M2↔no-free-text). | DATA + SEC | Contrato de eventos + revisión de privacidad | **Sí** |
| F2 | **Read-model de metodología definido** y que **excluye `is_demo`** por construcción. Toda consulta de M3–M7 lleva `is_demo=false`; un `COUNT(*)` sin ese filtro es un bug de métricas. | DATA | Read-model + test | **Sí** |
| F3 | **Decidido dónde viven las alertas** de M3–M7 y de anomalía, **quién las recibe** y por qué canal. 🔶 Nota crítica: ninguna de las cinco métricas detecta por sí sola "el cron dejó de correr" — hace falta un detector explícito de **sync mudo** (ver §4.8). | PROD + BACK | Tabla de alertas con canal y owner | **Sí** |
| F4 | **Drill de restore de backup agendado y con fecha**, con RTO/RPO definidos. El corpus curado **no es reproducible por pipeline** (`architecture AR-14`): el backup *es* el activo crítico. | OPS + QA | Acta del drill con tiempo medido | **Sí** |
| F5 | **Criterios de "no publicar" escritos y aprobados** (kill criteria de §5.3), antes de que exista la tentación de publicar bajo presión de fecha. | PROD + LEG | Tabla de kill criteria aprobada | **Sí** |
| F6 | **Plantilla de `adapter.parse()`** definida con su criterio de aceptación: sobre el fixture A2, `parse()` devuelve **≥10 registros normalizados válidos** y `parse_ok=true`, y `normalize()` no produce ningún registro con `source_url` nulo. 🔶 N=10 por inferencia: el feed observado dio ~25 ítems con mezcla `Legacy` (`architecture §1.3`); 10 deja margen y sigue siendo un umbral exigente. **Revisar N tras el spike de Q3.** | BACK | Test del adapter en verde | **Sí** |

### 1.G — Verificación de "no hay huecos silenciosos" en el DoR

Regla de cierre de Fase 2 → Fase 9: **ningún ítem del DoR se cierra por consenso; se cierra por evidencia.** Si un ítem marcado *bloqueante* queda abierto, Fase 9 no arranca; si PROD decide arrancarla de todos modos, la decisión queda escrita con su riesgo aceptado.

| Bloqueante | Ítems | ¿Cerrado? |
|---|---|---|
| A — Corpus | A1–A7 | ⚠️ abierto (depende de Q1 y de la resolución de PROD en A1) |
| B — Estado | B1–B8 | ⚠️ abierto |
| C — Red/SSRF | C1–C8 | ⚠️ abierto (C8 depende de Q-A) |
| D — Legal | D1–D7 | ⚠️ abierto (D7 depende de Q2) |
| E — Copy | E1–E6 | ⚠️ abierto (E6 es decisión) |
| F — Medición | F1–F6 | ⚠️ abierto |

---

## 2. Definition of Done (DoD) del MVP

### 2.0 Qué significa "MVP hecho" aquí

`discovery §3.2` es explícito: el gate es **cobertura y confianza, no un conteo de registros**. Más registros sin verificar empeoran el producto. Y `discovery §7` es explícito en lo contrario: **conteo de registros, page views y shares no son métricas de éxito**.

Por tanto:

- **Declarar el MVP probado** = el gate `§3.2` se cumple **y** el producto es defendible ante U4 (asesora con riesgo reputacional) y correcto ante U1 (móvil, ansiosa por plazos).
- **No** significa "todas las funcionalidades Must están terminadas". Significa "el usuario recibe la promesa completa del §3.1 sobre datos que podemos respaldar".
- **No** es declarado con datos de demostración en ningún caso (`D7`, `architecture §12`).

### 2.0.b DoD global §11.1–11.4 — ⚠️ NO VERIFICABLE EN EL REPO

`architecture §15` referencia un "DoD global §11.1–11.4 del plan original". **Ese plan no está en el repositorio** (el repo contiene solo `docs/`, con 5 documentos; ninguno tiene11 secciones de DoD). No puedo leerlo y **no lo voy a inventar**.

Lo que sí hago es la **reconstrucción mínima** de la intención, derivada de `discovery §3.1` + `§9` + `§8 R3` + `value-impact §9`, marcada 🔶 INFERENCIA, para que haya algo verificable mientras tanto. **PROD debe contrastarla con el plan original y decir si coincide.**

| # | Criterio reconstruido 🔶 | Método de verificación | Evidencia | Bloq. |
|---|---|---|---|---|
| B0.1 | **El producto no afirma nada que no pueda respaldar.** Cada dato visible tiene fuente o copy explícito de ausencia. | Test de copy + test de serialización + muestreo manual de 50 registros | CI verde + muestra anotada | **Sí** |
| B0.2 | **U4 puede defender una captura de pantalla ante un estudiante.** ¿Podría justificar cada elemento visible? | Revisión de diseño firmada por PROD contra `discovery §9.10` | Checklist §9 firmado | **Sí** |
| B0.3 | **El corpus es mantenible, no un snapshot.** Un maintainer que no escribió el código puede re-verificar, corregir y retirar un registro siguiendo el protocolo. | Ensayo del protocolo de curation por una persona distinta del autor | Ensayo documentado | **Sí** |
| B0.4 | **Ninguno de los claims de marketing excede la evidencia.** Cero contadores sin query, cero "confiado por X", cero cobertura no declarada. | Test de copy + revisión de la página de metodología contra el read-model | CI + página en prod | **Sí** |

### 2.1 Criterios bloqueantes para declarar el MVP

#### Bloque 1 — Gate de cobertura y confianza (`discovery §3.2`)

| # | Criterio | Método de verificación | Evidencia requerida | Bloq. |
|---|---|---|---|---|
| M-01 | **≥300 registros reales** (`is_demo=false`, `is_published=true`) | Query de conteo | Captura del resultado + fecha | **Sí** |
| M-02 | **≥20 países de destino** | `COUNT(DISTINCT country_iso2)` sobre publicados | Ídem | **Sí** |
| M-03 | **≥15 dominios fuente distintos** | `COUNT(DISTINCT host(source_url))` sobre publicados | Ídem + tabla de fuentes | **Sí** |
| M-04 | **`source_url` resoluble en dominio oficial = 100%** (ver §2.3 para la reconciliación con el "≥90%" de `§3.2`) | M3 (§4.1) | Reporte de M3 | **Sí** |
| M-05 | **100% de publicados con `last_verified_at` no nulo** | Query + `CHECK` de DB | Reporte | **Sí** |
| M-06 | **≥80% verificados en los últimos 14 días** | M4 (§4.2) | Reporte | **Sí** |
| M-07 | **M5 ≤5%** (`UNKNOWN` entre los que la fuente afirma abiertos) | M5 (§4.3) | Reporte | **Sí** |
| M-08 | **M6 ≤2%** (duplicados) | M6 (§4.4) | Reporte | **Sí** |
| M-09 | **≥3 de los 5 programas anuales de mayor volumen** con su ciclo actual, **verificados a mano ≤7 días tras la apertura** | Registro de verificación manual con `curator` y fecha | Bitácora de curation | **Sí** |

#### Bloque 2 — El riesgo terminal (R3) tiene respuesta operativa probada

| # | Criterio | Método de verificación | Evidencia requerida | Bloq. |
|---|---|---|---|---|
| M-10 | **Kill switch probado**: una fuente se congela de extremo a extremo **sin deploy**, y sus registros dejan de publicarse sin borrarse | Drill cronometrado | Hora de corte + `fetch_log` + `sync_runs` | **Sí** |
| M-11 | **Playbook R3 ensayado** (tabletop) por al menos 2 personas, incluyendo el escenario "un usuario actúa sobre un estado falso" | Sesión ensayada + acta con decisiones tomadas | Acta | **Sí** |
| M-12 | **Ningún campo interno en respuestas públicas** | Test de CI de allowlist de serialización | CI verde en el commit de release | **Sí** |
| M-13 | **Tests negativos de SSRF verdes en CI** (10 rangos + DNS rebinding), no en checklist | Job de CI | Link al job | **Sí** |
| M-14 | **Restore de backup ejecutado y medido**, con RTO/RPO reales | Drill documentado | Acta con tiempos | **Sí** |
| M-15 | **Página de metodología en producción con números del read-model real**, declarando qué no afirmamos | Revisión contra el read-model | URL + captura | **Sí** |
| M-16 | **Página de fuentes y atribución viva** con licencia, ToS, fecha de revisión y volumen por fuente | Revisión legal | URL | **Sí** |
| M-17 | **"Report a correction" en producción y con SLA de respuesta comprometido**, con al menos **1 caso resuelto y su corrección visible públicamente** | Ensayo del flujo end-to-end | Ticket resuelto + página de correcciones | **Sí** |
| M-18 | **Copy de descargo de responsabilidad visible** en resultados y detalle; cero lenguaje prohibido | Test de copy | CI + captura | **Sí** |

#### Bloque 3 — El dato no engaña (R6, R7, AR-4, `§9.10`)

| # | Criterio | Método de verificación | Evidencia requerida | Bloq. |
|---|---|---|---|---|
| M-19 | **Cero countdowns imposibles**: ninguna combinación produce "0 días" sobre algo abierto, ni valores negativos. Tests parametrizados sobre `basis × status × tz`. | Tests AR-4 | CI verde | **Sí** |
| M-20 | **`UNKNOWN` distinguible sin depender del color**: texto propio + posición jerárquica distinta de `CLOSED`, y verificable con contraste WCAG AA | Revisión de accesibilidad de los6 estados | Capturas de los 6 estados | **Sí** |
| M-21 | **Deadline legible en móvil** a la distancia de U1 (`discovery §9.10`): prueba en un móvil de gama media, no en un viewport de escritorio reducido | Prueba manual registrada | Video/captura + dispositivo | **Sí** |
| M-22 | **Separación explícita deadline-de-beca vs. deadline-de-admisión-universitaria** en la página de detalle (`§3.1.4`) | Revisión de copy | Captura | **Sí** |
| M-23 | **Demo y real nunca mezclados**: `prod` sin datos demo, badge no configurable por entorno, `is_demo` inmutable | Query `is_demo` en prod = 0 + test del badge | Query + test | **Sí** |

### 2.2 Criterios deseables (no bloquean la declaración de MVP)

Se listan porque son valiosos, pero **bloquear el MVP por ellos es exactamente el patrón R8** ("gravedad de alcance") que `discovery §8` quiere impedir. Cada uno tiene una condición explícita para promoverse a bloqueante.

| # | Criterio | Método | Condición para volverse bloqueante | Nota |
|---|---|---|---|---|
| D-01 | **M1 ≥40%** (search-to-action) | Funnel PostHog | **No bloqueante por definición:** exige tráfico. Se evalúa a 30 días post-lanzamiento. Si a 30 días M1 <20%, el problema no es el producto: es adquisición o cobertura → se revisa `discovery §3.1.2`, no la arquitectura | No inventar tráfico |
| D-02 | **M2 ≤10%** en las20 intenciones de mayor volumen | `search_events` | 🔶 Was in `value-impact §5.2` and got dropped in consolidation. **Recomiendo restaurarlo como deseable de30 días.** Si M2 >10% y M1 ≥40% → dispara la reevaluación de Q5 (embeddings) | ⚠️ §8 C6 |
| D-03 | **≥8 de las 20 intenciones de mayor volumen devuelven resultados reales** | Query sobre `intent_key` | Igual que D-02. Se convierte en bloqueante **solo** si se declara cobertura amplia en marketing | ⚠️ §8 C6 |
| D-04 | **M8 ≥25%** (usuarios que regresan) | PostHog o tabla first-party | No bloqueante: sin cuentas, la retención media del sector es baja y el valor de U4 (asesora) no se captura en esta métrica | Aceptar el trade-off de privacidad |
| D-05 | **Panel interno más allá de la vista de estado por fuente** | Revisión | Solo si el volumen de `needs_review` supera lo que una tabla y una query cubren | `§3.5` lo saca de alcance |
| D-06 | **Página por entidad/financier** ("todas las becas Chevening") | Revisión | Solo si hay demanda medida en búsquedas sin resultados | Es SEO + confianza (`§3.3.3`) |
| D-07 | **Conglomerado del fiasco del globo 3D** | Los 4 criterios de `discovery §2.1` | Solo si se cumplen **los 4** | No bloqueante: es adición, no requisito |

### 2.3 Reconciliación necesaria: `§3.2` dice90%, M3 dice 100%

`discovery §3.2` incluye el criterio "Registros con `source_url` resoluble en dominio oficial ≥90%". `discovery §7 M3` dice **100%**, y `ADR-004` lo vuelve **100% por construcción** con un `CHECK` de Postgres.

**Veredicto de Fase 2:** el 100% gana. Un `CHECK` en base de datos no puede producir "90%"; produce 100% o nada. Mantener el 90% invites a que alguien lo use como umbral de tolerancia. **El 90% debe eliminarse del gate o reescribirse como "100% por construcción, verificado por el `CHECK` + M3".**

Consecuencia operativa adicional que este documento añade: **"resoluble" no es computable por nosotros en MVP.** Verificar automáticamente nuestros propios `source_url` implicaría rastrear a terceros sin valor para el usuario (`security §3.2` fair-use, `R1`). Por tanto M3 se descompone en:

| Componente | Cómo se cumple | Computable por nosotros |
|---|---|---|
| **M3a — Presencia** | `CHECK` de DB (`architecture §7.2`) | Sí, trivial |
| **M3b — No agregador** | Denylist `discoveryHostDenylist` + registro de rechazos (ADR-004 d) | Sí |
| **M3c — Resoluble en el sentido de "la persona detrás del registro abrió ese URL y leyó lo que dice"** | Verificación humana del curador en el momento de curar y en la cadencia (`legal-matrix §11`) | **No** — y está bien que no lo sea |

> ⚠️ **Hallazgo para Fase 4 (`@database`):** el ERD (`architecture §7.1`) **no tiene un registro de hosts oficiales por fuente**. M3b necesita saber "este host es la entidad awarding o es un agregador". Sin tabla de allowlist de hosts o sin `official_host` por registro, M3b es una comprobación manual no automatizable. **Es una decisión de schema, no un detalle.** Recomiendo `sources.official_hosts text[]` + denylist en descriptor.

---

## 3. Scope final del MVP (reafirmado)

### 3.1 Must-have

> Una frase (`discovery §3.1`): buscar becas verificadas, ver quién las publica y cuándo se comprobó por última vez, saber exactamente cuántos días quedan, y no decir nada que no podamos respaldar.

| # | Must | Base | Nota de valor |
|---|---|---|---|
| **M1** | **Corpus semilla curado** que cumple el gate `§3.2` | `§3.1.1`, `§3.2`, `D2` | Es el activo. Sin él no hay producto. |
| **M2** | **Búsqueda + filtros** (nivel, área, país, financiación, ventana de deadline, estado) con FTS sobre título + entidad + universidad | `§3.1.2`, RF-1 | Es la interfaz del job J1, no un adorno. GIN desde el día 1. |
| **M3** | **Tarjeta con las variables de decisión primero**: estado, días restantes, fecha límite **con su base**, entidad, monto (o `No especificado`), dominio fuente | `§3.1.3`, `§9.1` | El orden de la jerarquía **es** la propuesta de valor. |
| **M4** | **Detalle** con `No publicado` explícito, fuente oficial prominente, `last_verified_at` en zona del usuario, motivo cuando `UNKNOWN`, y separación deadline-de-beca vs. deadline-de-admisión | `§3.1.4` | Es lo que U3 y U4 necesitan para no avergonzarse. |
| **M5** | **Motor de estado**: 6 estados, función pura, fuente explícita gana, no `CLOSED`-on-failure, no `OPEN`-from-fecha, `LAST_KNOWN_STATUS` preservado, suite que cubre **todas** las rutas de fallo | `§3.1.5`, `D4`, ADR-002 | Mata el modo de fallo F3, el más caro del producto. |
| **M6** | **Shortlist anónima** (token, sin login) + URL compartible de solo lectura | `§3.1.6`, `D5` | Job J4 con fricción cero. |
| **M7** | **Página pública de metodología**: cuántos registros, cuántas fuentes, último run, qué significa "verificado", **qué no afirmamos** | `§3.1.7`, `D6` | La mitad no-afirmada es la que genera confianza. |
| **M8** | **Monitor de enlaces y frescura** por fuente; un registro no re-verificado en N días **envejece visiblemente** | `§3.1.8` | Convierte R10 (decaimiento) en algo visible en lugar de oculto. |
| **M9** | **1 adapter automatizado (EACEA RSS) + un normalizador compartido, por el que pasa también la curación manual** | `D2`, ADR-001, RF-8 | ⚠️ Corrección terminológica: `§3.1.9` decía "3 integraciones de fuente". Con la matriz legal vigente, **3 automatizadas son imposibles hoy** (`legal-matrix`: 7 de 7 restantes `DO-NOT-USE`/`AMBIGUOUS`). El requisito real es *una tubería de validación única* por la que entran las tres vías de ingesta. Ver §8 C2. |
| **M10** | **Anti-abuso básico**: sin ruta de pago, sin "garantizado", sin enlaces de afiliado, checklist de señales de estafa | `§3.1.10`, `D9` | La ausencia de incentivo económico **es** la defensa competitive. |
| **M11** | **`CHECK` de publicación en DB** (`source_url` + `last_verified_at` + `source_licence`) | ADR-004 (b), RF-3 | *Derivado, no nuevo*: es lo que hace que M3=100% sea verdad en lugar de aspiracional. Sin esto, M4 §2.1 no es un criterio, es un deseo. |
| **M12** | **Kill switch por fuente + drill** | `legal-matrix §9` #27, ADR-004, R3 | *Derivado*: sin él, R3 tiene detección pero no contención. Respuesta a la necesidad F3 §15.4. |
| **M13** | **"Report a correction"** visible, sin cuenta, encolando `needs_review` | `legal-matrix §10.2`, `§11` | *Derivado*: es el control compensatorio declarado de toda la estrategia de datos. Un producto público sin salida de error es indefendible. |

### 3.2 Should-have (post-MVP, **en este orden**)

| # | Should | Por qué en esa posición | Condición de entrada |
|---|---|---|---|
| S1 | **Estado de postulación por item guardado** (saved / preparando / postulado / resultado) | La mejor expansión de J1: convierte la lista en gestión. `§3.3.1` | Post-MVP **y** con decisión de auth resuelta (hoy no hay identidad) |
| S2 | **Digest de deadlines** (email/WhatsApp) | Automatiza J1. `§3.3.2` | **Solo tras demostrar corrección de deadlines**: notificar un deadline erróneo amplifica el daño de R3 |
| S3 | **Páginas por entidad/funder** | SEO + superficie de confianza. `§3.3.3` | Existe corpus suficiente por entidad |
| S4 | **Exportación de shortlist** (CSV / imprimible) | Es el formato que U4 usa de verdad (hoja de cálculo). `§3.3.4` | Inmediata, pero baja prioridad frente a S1 |
| S5 | **Comparador de 2–3 oportunidades** | Útil cuando la decisión es real, no como función permanente. `§3.3.5` | Post-S4 |
| S6 | **Correo de "los enlaces cambiaron" + explicación** | `§3.3.6`. Requiere S2. | Post-S2 |
| S7 | **Globo/coropleta** | Los 4 criterios de `§2.1`, **todos**. `§3.3.7` | Ver D-07 |

### 3.3 Nice-to-have

Score de ajuste (solo si se demuestra útil) · mapa de calor de concentración · i18n más allá de ES/EN · PWA · exportación a calendarios. (`§3.4`)

### 3.4 Explícitamente fuera de alcance — con la razón de la exclusiónCada exclusión nombra **el fallo que evita** o **el coste que no compra**. Si alguna no puede justificar su exclusión en una línea, es que en realidad es un Should.

| # | Excluido | Justificación en una línea |
|---|---|---|
| X1 | **Auth con email / SSO / cuentas** | El token anónimo cubre el 100% del job de MVP; auth cuesta superficie de seguridad completa y no compra un solo byte de verificabilidad (D5, `ADR`). |
| X2 | **Notificaciones / digest** | Depende de que la corrección de deadlines esté probada; notificar un error amplifica R3 en vez de reducirlo. |
| X3 | **Pipeline de postulación / postular por el usuario** | Es otro producto y roza el modelo de monetización ansiosa que R9 quiere evitar; además exige PII. |
| X4 | **Panel admin más allá de una vista interna de estado** | No es un job de ningún usuario; el trabajo real es la cola `needs_review`, que cabe en una tabla + una query. |
| X5 | **Score de compatibilidad / matching** | No es diferenciador y reintroduce exactamente la inferencia que ADR-004 prohíbe: un score es un dato inventado con formato de número. |
| X6 | **Scraping masivo / más fuentes automatizadas** | La matriz legal verificó7 de 7 fuentes restantes como `DO-NOT-USE` o `AMBIGUOUS`; automatizarlas no es una decisión de producto, es una decisión legal negativa. |
| X7 | **App móvil nativa** | U1 es móvil *web*; una app no añade verificabilidad, y es el doble de superficie para el mismo job. |
| X8 | **Comparador permanente** | El caso real son 2–3 elementos; es una tarea efímera, no una superficie que someone's tail. |
| X9 | **Monetización de cualquier tipo** (pago, desbloqueo, lead-gen, colocación pagada) | La confianza es el activo; el incentivo a mostrar más de lo verificado lo destruye. Además es lo único que los incumbentes no pueden copiar (R9, D9). |
| X10 | **Globo 3D en MVP** | Optimiza J3 (el job de menor frecuencia), la evidencia cartográfica dice que 3D **empeora** el lookup preciso, y con cobertura parcial sugiere cobertura total → mentira visual (ADR-001, `§2.1`). |
| X11 | **Búsqueda semántica / embeddings** | Postgres FTS resuelve el volumen de MVP; reevaluar **solo** con M2 >10% **y** M1 ≥40% (Q5, `ADR`). |
| X12 | **Normalización de importes a USD** | Pierde precisión y obliga a un claim ("indicativa") que `§9.5` prohíbe: los números aparecen solo si podemos sustentarlos. |
| X13 | **Redis / motor genérico de jobs / orquestador de adapters** | Resuelven problemas que aún no existen con 1 fuente y 1 unauthor; AR-8, `§2.2`. |
| X14 | **Proxy de egress** | Defence-in-depth deseable; la frontera de fetch ya está encapsulada para añadirlo post-MVP sin tocar adapters (ADR-003). |
| X15 | **PII / perfiles / notas de postulación** | Bloquea medir outcomes reales (el trade-off explícito de `value-impact §9`) pero es el precio de no ser un portal de solicitudes (`legal-matrix §10.3`). |
| X16 | **Copiar prosa de terceros / catálogo a nivel de programa universitario** | D8: almacenamos hechos + enlace. Y X16b: un catálogo de cientos de miles de registros es un problema legal, no de alcance. |

---

## 4. SLOs operativos M3–M7

### 4.0 Marco común (define el significado de los umbrales)

**Escala de severidad.** 🔶 INFERENCIA — el repo solo define "confianza = Sev-1" (`discovery §8 R3`); el resto lo escalono aquí de forma consistente.

| Sev | Definición | Tiempo de respuesta |
|---|---|---|
| **Sev-1** | El producto **afirma algo falso** sobre una convocatoria, o un usuario pudo actuar sobre esa afirmación. Incluye: publicar sin `source_url`; afirmar `OPEN`/`CLOSED` sin evidencia; countdown con base inventada; campo inventado; demo mezclado con real. | Inmediato, contención en minutos |
| **Sev-2** | El producto **no afirma nada falso** pero induce a error o pierde capacidad crítica: fuente degradada sirviendo la vista "abiertas", `UNKNOWN` excesivo, duplicados sin resolver, metodología desactualizada, sync mudo. | Mismo día |
| **Sev-3** | Defecto de confianza sin afirmación falsa: copy, badge, jerarquía visual, orden de la tarjeta. | Semana |
| **Sev-4** | Cosmético. | Backlog |

**Regla que atraviesa todos los SLOs (respondiendo a `architecture §15.3`):**
> **Ningún SLO se relaja para "mejorar" la apariencia del producto.** Si M5 sube porque el motor es más conservador, eso es el sistema **funcionando**, no fallando. Lo que se ajusta es la **comunicación** (la metodología explica el X% no verificable hoy), nunca el dato ni el umbral de `UNKNOWN`.

**Denominadores.** Todos los SLO excluyen `is_demo=false` explícitamente. Toda métrica que no lleve ese filtro es un bug (`architecture §12`).

### 4.1 M3 — Tasa de fuente verificable

| Campo | Valor |
|---|---|
| **Definición técnica** | M3 = publicados con `source_url` presente **Y** cuyo host no está en ninguna denylist de descubrimiento **Y** verificado por curador en la cadencia / publicados. Descompuesta en M3a (presencia, `CHECK` DB), M3b (host no agregador, denylist), M3c (resoluble, humano). ⚠️ M3c **no es computable automáticamente** en MVP — ver §2.3. |
| **Umbral** | M3a = **100% absoluto, por construcción**. Una sola violación esSev-1 (implica publicación por una vía que saltó el `CHECK` → datos fuera de la tubería). M3b = **100%**. M3c = ≥98% por ventana de 30 días → cola de curation; <95% → Sev-2 para esa fuente. |
| **Periodo** | M3a/M3b: **tiempo real**, comprobado tras cada transacción de publicación (es una restricción, no una estadística). M3c: **rolling 30 días**, snapshot diario. |
| **Alerta** | `M3a < 100%` → **Sev-1**, inmediata. `M3c < 95%` → **Sev-2**. Denylist match en un `source_url` en proceso de curate → **Sev-3** + cuarentena. |
| **Qué hacer** | **Sev-1:** (1) kill switch de la fuente afectada; (2) `is_published=false` para todos sus registros, **sin borrar**; (3) identificar la vía de escritura que saltó el `CHECK` y cerrarla; (4) buscar en `audit_trail` cuántos registros entraron por esa vía y en qué ventana; (5) corrección pública. **Sev-2:**Identifier los dominarios, priorizando los de mayor volumen, y abrir tarea de curation. |

```sql
-- PSEUDO-SQL · conceptual, no ejecutable tal cual
-- M3a: debe dar exactamente published. Si no, hay una fuga.
SELECT COUNT(*) FILTER (WHERE source_url IS NULL OR last_verified_at IS NULL
                          OR source_licence IS NULL) AS violadoresFROM scholarships
WHERE is_published AND is_demo = false;
-- El CHECK de DB (architecture §7.2) hace que violadores = 0 SIEMPRE.
-- Un violadores > 0 significa: alguien escribió fuera de la tubería. Es Sev-1.

-- M3b: qué publicados apuntan a un host marcado como no-oficial
SELECT host(source_url) AS host, COUNT(*) AS n
FROM scholarships s
JOIN source_host_denylist d ON d.host = host(s.source_url)   -- ⚠️ tabla a definir en Fase 4
WHERE s.is_published AND s.is_demo = false
GROUP BY 1 ORDER BY n DESC; -- cualquier fila = incidente

-- M3c: relies on human verification → no query. Es un campo:
SELECT COUNT(*) FILTER (WHERE NOT curator_verified_recently(last_verified_at, 30))
 / COUNT(*) AS m3c FROM scholarships
WHERE is_published AND is_demo = false;
```

### 4.2 M4 — Frescura de estado

| Campo | Valor |
|---|---|
| **Definición técnica** | publicados con `last_verified_at >= now() - interval '14 days'` / publicados, **excluyendo `is_demo`**. Se reporta **global y por `source_id`** — un agregado global puede esconder una fuente muerta. |
| **Umbral** | Objetivo **≥80%**. **Alerta si <60%** (`discovery §7`). Por fuente: <60% sostenido7 días → esa fuente sale de las vistas "abiertas" (R2). |
| **Periodo** | Medición continua con snapshot diario. La alerta se evalúa cada 24 h. La ventana de 14 días da inercia a propósito: evita que un fin de semana genere ruido. |
| **Alerta** | Global <60% → **Sev-2**. Una fuente <60% → **Sev-2** con alcance acotado. Global <50% → **Sev-1** (el producto está mostrando antigüedad como si fuera actualidad: eso es exactamente lo que `legal-matrix §11` llama *"misrepresented itself"*). |
| **Qué hacer** | (1) Segmentar por fuente. (2) Si M7 de esa fuente <70% → **kill switch**: no es un problema de curación, es de la fuente. (3) Si M7 está bien → el problema es **cadencia humana**: activar el badge de envejecido y el de-ranking (`legal-matrix §11`), y avisar al owner de curation. (4) Publicar la cifra real en la metodología. (5) **Nunca** "arreglar" la métrica relajando el umbral de 14 días. |

```sql
-- M4 globalSELECT COUNT(*) FILTER (WHERE last_verified_at >= now() - interval '14 days')::float
       / COUNT(*) AS m4
FROM scholarships WHERE is_published AND is_demo = false;

-- M4 por fuente  ← el que manda para decidir kill switch
SELECT source_id,
       COUNT(*) FILTER (WHERE last_verified_at >= now() - interval '14 days')::float
         / COUNT(*) AS m4_fuente,
       MAX(last_verified_at) AS ultima_verificacion,
       COUNT(*) AS registros
FROM scholarships WHERE is_published AND is_demo = false
GROUP BY source_id ORDER BY m4_fuente ASC;
```

### 4.3 M5 — `UNKNOWN` en accionables

| Campo | Valor |
|---|---|
| **Definición técnica** | Numerador: publicados con `internal_status='UNKNOWN'` **y** cuyo último estado de fuente conocido (`source_status`, preservado) afirma apertura (`IN ('OPEN','UPCOMING')`). Denominador: publicados cuyo `source_status ∈ ('OPEN','UPCOMING')`. Es la **cohorte donde un estado equivocado hace daño**: no verificable *mientras la fuente dice que está abierta*. Un `UNKNOWN` en algo ya cerrado es aceptable y no penaliza. |
| **Umbral** | **≤5%** global. Por fuente: ≤10%. |
| **Periodo** | 24 h rolling con snapshot diario. **Tendencia a 7 días** para distinguir "un día malo" de "la fuente se estámuriendo". |
| **Alerta** | Global >5% en 24 h → **Sev-2**. Global >15% → **Sev-1** (el pool de "accionables" se volvió decorativo; peor que un producto más pequeño y honesto). Una fuente >30% → esa fuente sale de las vistas "abiertas". |
| **Qué hacer** | **Nunca** degradar `UNKNOWN` a `CLOSED` para bajar la métrica: eso es el daño terminal. Secuencia: (1) ¿es una fuente o todas? (2) si es una fuente → M7 y kill switch; (3) si son todas → revisar M4 (¿cadencia? ¿parser?), redness y quotas; (4) revisar si el copy de `UNKNOWN` está inviteando al clic a la fuente (esa es la señal de que el estado funciona, R7); (5) si tras el diagnóstico M5 sigue alto y es honesto → **se comunica**, no se maquilla: la metodología dice "hoy no verificamos el X% de las abiertas". |

```sql
-- M5: la métrica más importante del set. Nota el denominador restricted.
WITH accionables AS (
  SELECT * FROM scholarships
  WHERE is_published AND is_demo = false
    AND source_status IN ('OPEN','UPCOMING')     -- "la fuente afirma estar abierta"
)
SELECT
  COUNT(*) FILTER (WHERE internal_status='UNKNOWN')::float / NULLIF(COUNT(*),0) AS m5,
  COUNT(*) AS total_accionables,
  COUNT(*) FILTER (WHERE internal_status='UNKNOWN') AS unknown_en_accionables
FROM accionables;

-- ¿el motivo está siendo el correcto?  (UNKNOWN sin motivo = bug de serialización)
SELECT status_reason, COUNT(*) FROM scholarships
WHERE internal_status='UNKNOWN' AND is_published AND is_demo=false
GROUP BY 1 ORDER BY 2 DESC;
```

### 4.4 M6 — Tasa de duplicados

| Campo | Valor |
|---|---|
| **Definición técnica** | publicados que pertenecen a un `duplicate_group_id` con **más de un miembro publicado** / publicados. Companion obligatoria: **grupos abiertos sin resolver hace >14 días**. |
| **Umbral** | ≤2%. Grupos sin resolver >14 días: **0 tolerados**. |
| **Periodo** | **Snapshot semanal** (es una métrica de higiene de corpus, no de salud en vivo; medirla a diario genera ruido y presión por fusionar rápido). |
| **Alerta** | >2% → **Sev-3**. >5% → **Sev-2**. ≥1 grupo sin resolver >14 días → **Sev-3** con fecha límite. |
| **Qué hacer** | Curador decide el merge **manualmente** y marca `is_canonical` (el índice único `one_canonical_per_group` lo impone). **Nunca merge automático**: fusionar dos programas distintos hace que el usuario postule a la beca equivocada, y ese coste supera con creces el beneficio cosmético de limpiar la lista. Si el grupo no se puede decidir en 14 días → **despublicar el no canónico** (pierde visibilidad, no pierde datos). |

```sql
-- M6
WITH g AS (
  SELECT duplicate_group_id, COUNT(*) AS miembros
  FROM scholarships
  WHERE is_published AND is_demo = false AND duplicate_group_id IS NOT NULL
  GROUP BY 1 HAVING COUNT(*) > 1
)
SELECT (SELECT COUNT(*) FROM scholarships WHERE is_published AND is_demo=false
 AND duplicate_group_id IN (SELECT duplicate_group_id FROM g))::float
       / (SELECT COUNT(*) FROM scholarships WHERE is_published AND is_demo=false) AS m6;

-- companion: grupos sin decidir (🔶 requiere marca de "abierto"; p.ej. needs_review=true)
SELECT duplicate_group_id, COUNT(*) AS miembros, MAX(created_at) AS abierto_hace
FROM scholarships
WHERE duplicate_group_id IS NOT NULL
GROUP BY 1 HAVING COUNT(*) > 1 AND MAX(created_at) < now() - interval '14 days';
```

### 4.5 M7 — Éxito de sync

| Campo | Valor |
|---|---|
| **Definición técnica** | Por fuente y ventana de 7 días: runs con `parse_ok=true` **y** `status_extracted=true` / runs **contabilizables**. 🔶 Decisión de definición, necesaria porque el repo no la precisa: un run `not_modified` (HTTP 304) es un run **sano**, y un `skipped_locked` (carrera, AR-6) **no es un fallo**. Ambos se **excluyen del denominador**; contarlos como fallo produce una falsa alarma diaria con un feed bien configurado. `outcome ∈ ('failed')` por `budget_exhausted` **sí** cuenta como fallo. |
| **Umbral** | **≥90% por fuente.** Cualquier fuente **<70% por 3 días consecutivos** → alerta (`discovery §7 M7`). **0 runs ejecutados en 24 h (cuando corresponde)** → alerta inmediata e independiente del porcentaje. |
| **Periodo** | Rolling 7 días para el porcentaje; snapshot por ejecución para el conteo de runs. La alerta se evalúa **diariamente**. |
| **Alerta** | <90% → **Sev-3**. <70% × 3 días → **Sev-2**. **Sync mudo (0 runs donde corresponde)** → **Sev-1**. `needs_review_count` >50% de `records_seen` en un run → **Sev-2** (el parser está produciendo basura, no datos). |
| **Qué hacer** | Leer `fetch_log` antes de tocar nada: (a) **cambio de XML** → versionar el contrato del parser, `UNKNOWN` + `needs_review` para el lote, nunca `CLOSED`; (b) **403/429/CAPTCHA** → **no** reintentar aggressive, **no** evadir: activar la fuente en modo degradado, avisar al owner y valorar el kill switch; (c) **circuit abierto** → esperar, es comportamiento correcto; (d) **5xx sostenido** → backoff y esperar; (e) **budget_exhausted** → subir el presupuesto o bajar la prioridad de otros, nunca los límites de seguridad. En todos los casos: **un fallo de sync produce `UNKNOWN` + preservar `last_known_status`**. Si en algún momento la propuesta de arreglo implica "marcar cerrado para que la UI no muestre basura", **es incorrecta por construcción**. |

```sql
-- M7 por fuente, 7 días
SELECT source_id,
       COUNT(*) FILTER (WHERE parse_ok AND status_extracted)::float
         / NULLIF(COUNT(*),0) AS m7,
       COUNT(*) AS runs,
       COUNT(*) FILTER (WHERE outcome='not_modified')   AS runs_304_excluidos,
       COUNT(*) FILTER (WHERE outcome='skipped_locked') AS runs_lock_excluidos,
       MAX(started_at) AS ultimo_run
FROM sync_runs
WHERE started_at >= now() - interval '7 days'
  AND outcome NOT IN ('not_modified','skipped_locked')
GROUP BY source_id;

-- Sync mudo: el detector que M7 NO cubre (ver §4.8)
-- 🔶 EXPECTED_CADENCE viene del descriptor; si last_run < now() - 1.5 × cadence → incidente
```

### 4.6 Resumen de la tabla de alertas

| SLO | Verde | Amarillo | Rojo | Severidad roja | Canal |
|---|---|---|---|---|---|
| **M3** | 100% (por construcción) | M3c <98% | M3a <100% · M3c <95% | **Sev-1** / Sev-2 | Alerta propia + kill switch |
| **M4** | ≥80% | 60–80% | <60% · <50% | Sev-2 / **Sev-1** | Diaria |
| **M5** | ≤5% | 5–15% | >15% | Sev-2 / **Sev-1** | Diaria |
| **M6** | ≤2% | 2–5% | >5% · grupo abierto >14 d | Sev-3 / Sev-2 | Semanal |
| **M7** | ≥90% | 70–90% | <70% ×3 d · sync mudo · needs_review masivo | Sev-2 / **Sev-1** | Diaria + por run |

### 4.7 Los cinco SLOs en una frase cada uno (para no perder el sentido)

- **M3**: nunca afirmamos algo que novemmos de dónde sale.
- **M4**: lo que no reimvisitamos se **nota**, no se disimula.
- **M5**: preferimos decir "no lo sé" a decir "cerrada". M5 alto no es un bug: es el motor funcionando.
- **M6**: preferimos dos filas que el usuario pueda distinguir a dos filas que no puede.
- **M7**: preferimos no tener datos a tener datos inventados.

### 4.8 Alertas de anomalía que **no** son SLOs pero se disparan con ellos

Estas no son "métricas de éxito" (son señales de daño), pero son la instrumentación que convierte `discovery §8 R3` de una declaración en un detector.

| # | Detector | Umbral 🔶 | Severidad | Por |
|---|---|---|---|---|
| A1 | **Flip masivo a `CLOSED`** en un run | >20% de los registros vistos cambian a `CLOSED` en un solo run | **Sev-1** | Data poisoning o bug del parser (AR-7). Congelar la fuente **antes** de propagar |
| A2 | **Flip masivo a `OPEN`** | >20% en un run | **Sev-2** | Menos grave que `CLOSED` (un falso "abierta" se detecta al clicar), pero indica señal rota |
| A3 | **Ráfaga de `needs_review`** | `needs_review_count / records_seen > 50%` en un run | **Sev-2** | El parser está produciendo basura, no datos |
| A4 | **Sync mudo** | `último_run > 1.5 × cadence esperada` | **Sev-1** | "El sistema parece vivo y no lo está" (AR-5). **Ninguna de M3–M7 lo detecta.** |
| A5 | **Renderer de countdown imposible** | Cualquier render con `basis='unknown'` o `status='UNKNOWN'`, o con valor ≤0 sobre algo abierto | **Sev-1** | Debe ser imposible por test (M-19). Si aparece, alguien cambió el render sin cambiar los tests |
| A6 | **Registro publicado sin verificación en la cadencia de su tipo** | `now() - last_verified_at > intervalo de legal-matrix §11` para el tipo | **Sev-2** | Convierte la cadencia legal en una señal, no en una intención |
| A7 | **Entrada en denylist** | Un `source_url` cuyo host entra en `discoveryHostDenylist` | **Sev-3** + cuarentena | Un agregador termina convertido en fuente |
| A8 | **Campo interno en respuesta pública** | Un solo match del test de serialización | **Sev-2** (Sev-1 si incluye PII) | `architecture §10.6` |

---

## 5. Playbook de trust erosion (R3) — una página

> **Contexto normativo:** `discovery §8 R3` ("cualquier incidente de confianza es un defecto Sev-1"), `value-impact §7 R3`, `legal-matrix §11` ("siendo wrong in public, honestamente"), ADR-002, ADR-004.
> **Supuesto:** el equipo es pequeño. Por eso el playbook no asume un turno24/7: define **una persona de guardia con nombre y horario**, y el resto de ventanas como "sin cambios permitidos" (ver R).

### 5.1 El escenario terminal

> Un usuario (U1, móvil, ansiosa por plazos) ve **"ABIERTA · 3 días restantes"** para una convocatoria que el editor cerró ayer. Dedica la tarde a la postulación, discovers que no, pierde horas y —peor— llega a la conclusión de que **todo lo que dice esta plataforma es dudoso**. Se va y no vuelve. No hay ticket, no hay métrica, no hay aviso.

**Por qué es terminal y no un bug más:** la confianza no se recupera en silencio. Se recupera lenta o no se recupera. Y aquí el daño no es reputacional abstracto: es una postulación perdida para una persona con anxieties reales.

### 5.2 Detección

- [ ] **D1 — A2/A1 (§4.8): flip masivo a `CLOSED` o a `OPEN`.** Detector automático, por run. Es la señal más temprana y la más grave.
- [ ] **D2 — M3a < 100%.** Publicación por una vía que saltó el `CHECK`. Indica que el proceso, no el dato, está roto.
- [ ] **D3 — M5 > 5%.** La fuente afirma abierto y nosotros no verificamos: un volumen alto aquí es precursor de/frases falsos.
- [ ] **D4 — M4 < 60% (fuente o global).** We're presenting antiquity as currency.
- [ ] **D5 — M7 < 70% × 3 días, o sync mudo (A4).** La fuente dejó de hablar y seguimos sirviendo lo último que dijo.
- [ ] **D6 — A5: countdown imposible renderizado.** Un test, no una mirada.
- [ ] **D7 — A7: `source_url` en denylist.** Un agregador termina siendo fuente.
- [ ] **D8 — Reportes de usuarios.** El canal más lento y el más honesto. **No es opcional**: es el único detector de cosas que ninguna métrica anticipa (un amount equivocado, un copy que induce a error).
- [ ] **D9 — Curador / revisor externo.** "Algo aquí no cuadra" antes de que sea un incidente.

### 5.3 Respuesta (con reloj)

**T+0 → T+15 min · Contención**

- [ ] **R1.1** Kill switch de la fuente afectada. **Sin deploy.** No se discute, no se "primero vemos si es grave".
- [ ] **R1.2** Los registros de esa fuente pasan a `is_published=false`. **Nunca se borran** (audit trail, AR-7).
- [ ] **R1.3** Congelar el run en curso si lo está (`pg_try_advisory_xact_lock` lo resuelve; no esperar a que termine de escribir basura).
- [ ] **R1.4** Si el defecto es **global** (no por fuente): banner de advertencia en la UI + ninguna vista "abiertas" hasta nuevo aviso.
- [ ] **R1.5** Registrar el incidente con hora exacta de inicio de la anomalía, **no** con la hora de detección.

**T+15 min → T+60 min · Alcance**

- [ ] **R2.1** Determinar **qué se afirmó falsamente**: registros, campos, ventana temporal, número de usuarios que pudieron verlo.
- [ ] **R2.2** ¿Alguien pudo actuar sobre ello? Un `OPEN` con 3 días es accionable. Un `UNKNOWN` mal copyado es confuso pero no accionable. **La diferencia determina la severidad real** y si hay que hablar con usuarios.
- [ ] **R2.3** Determinar **origen**: ¿parser, source, curación manual, render, o un cambio nuestro? Un `source` externo no es excusa; es el riesgo R2 materializado.

**T+60 min → T+24 h · Corrección**

- [ ] **R3.1** Corregir el dato. Si no se sabe el dato correcto → **`UNKNOWN` + `needs_review`**, nunca `CLOSED`.
- [ ] **R3.2** **Publicar la corrección.** Página de correcciones visible, con: qué pasó · cuándo lo detectamos · desde cuándo pasaba · qué hicimos · qué debe hacer el usuario. (`legal-matrix §11`: publicar correcciones es el control compensatorio, no un gesto.)
- [ ] **R3.3** Si hubo acción de usuario sobre el dato falso: comunicación directa a quien lo reportó + el mismo texto en la página de correcciones.
- [ ] **R3.4** Actualizar la metodología si las cifras cambiaron. **No** ocultar el incidente reduciéndolo a una nota al pie.

**T+24 h → T+7 d · Systemic**

- [ ] **R4.1** Post-mortem escrito, sin culpables, con la regla preventiva.
- [ ] **R4.2** La regla preventiva se añade como **ítem del DoR** (§1), para que el mismo fallo no pueda repetirse sin fricción.
- [ ] **R4.3** Si el incidente reveals un límite del gate `§3.2`, **se cambia el gate** (se retrasa o se reduce el alcance) — nunca se relaja el criterio de honestidad.

### 5.4 Cuándo **NO** publicar datos (kill criteria)

Estas son las condiciones en las que **retirar es la decisión correcta**, aunque reste registros, usuarios y apariencia. Cada una es un ítem bloqueante del DoR.

| # | Señal | Decisión | Por |
|---|---|---|---|
| K1 | No hay `source_url` en la página oficial de la entidad/programa | **No publicar.** Pasa por quarantine | `CHECK` de DB lo impide; no negociar |
| K2 | No hay evidencia allowlisted de estado | `UNKNOWN` + countdown **off** | ADR-002 |
| K3 | La fuente oficial cambió de layout o de URL y no podemos re-extraer | `UNKNOWN` + `needs_review`; conservar el valor bueno previo | `§4.3` |
| K4 | M7 de la fuente <70% por 3 días | **Retirar la fuente de las vistas "abiertas"**; mantener el enlace si el enlace sigue siendo válido | R2: "una fuente degradada se retira de las vistas abiertas, nunca se adivina" |
| K5 | Flip masivo a `CLOSED` sin explicación | **Congelar la fuente**; no propagar; revisar antes de republicar | AR-7 |
| K6 | `legal_clearance` vencida, retirada o cuestionada | **Kill switch inmediato** + despublicar los registros de esa fuente | `legal-matrix §9` A |
| K7 | La licencia/ToS pasa de permisivo a restrictivo | Kill switch + despublicar + revisar qué se republicó | R1 |
| K8 | Duplicado sin resolver >14 días | **Despublicar el no canónico** (no borrar) | §4 M6 |
| K9 | No podemos nombrar quién verificó el registro ni cuándo | **No publicar.** El registro existe; no es una oportunidad verificable | `legal-matrix §11` |
| K10 | El registro no pasa el protocolo de curation (p. ej. deadline no confirmado por segunda persona) | **No publicar** hasta que pase | `legal-matrix §11.4` |
| K11 | Un campo no está en la fuente y no hay base para derivarlo | **`null` + copy "No publicado"** — nunca relleno | ADR-004(a) |
| K12 | Estamos bajo presión de fecha de lanzamiento y el gate no se cumple | **Se retrasa el lanzamiento.** Se announces coverage real, no el gate | R5 |

> **La regla que resume la tabla:** *"We can always publish less. We can never publish something we cannot defend."* (Traducción operativa de D9 + `discovery §8 R1`: **menor volumen, mayor defendibilidad**.)

### 5.5 Qué comunicar al usuario (plantillas)

🔶 Copy propuesto; requiere aprobación de `LEG` + `DES` (DoR D3/E3). Los contenido obligatorios vienen de `legal-matrix §11` y `§10.3`.

**(a) Registro retirado**
> **Hemos retirado [programa] de los resultados.** No pudimos confirmar que la convocatoria estuviera abierta cuando la verificamos por última vez (fecha). Preferimos quitarlo a mostrarte información que no podemos respaldar. [Enlace a la fuente oficial] · [Enlace a la explicación completa]

**(b) Estado corregido**
> **Corregimos el estado de [programa].** Mostrábamos [estado incorrecto] y ahora es [estado correcto]. El error estuvo vigente desde [fecha] hasta [fecha de detección]. Puedes ver el historial de cambios en la ficha. Sentimos las ganas de haberlo corregido antes. [Enlace]

**(c) Fuente degradada**
> **No estamos actualizando datos de [entidad] temporalmente.** Dejamos de poder verificar sus convocatorias el [fecha] y, mientras tanto, las que tienen información antigua se marcan como "no verificable ahora" en lugar de mostrarse como abiertas. [Enlace a la fuente oficial]

**Reglas de copy para incidentes (no negociables):**
- [ ] Nunca "garantizado", "100% verificado", "en tiempo real", "siempre actualizado", "verificado por [entidad]" (`legal-matrix §10.4`).
- [ ] Nunca culpar a la fuente como causante: el usuario no tiene por qué saber de saltos de formato.
- [ ] **Nombrar el timeframe.** "Se corrigió" sin "desde cuándo estaba mal" es una corrección incompleta.
- [ ] **Say what the user should do**: ir a la fuente oficial. La corrected data is always the official page, not us.
- [ ] Una corrección publicada es **más Barth que un producto sin errores y sin canal de reporte**.

### 5.6 Criterios para **comprometer la promesa pública**

La promesa es, en una línea: *"cada registro tiene una fuente oficial identificable y una fecha de verificación, y admitimos lo que no sabemos."* Solo se compromete **públicamente** (home, metodología, materiales) cuando **los siete** son ciertos:

| # | Criterio | Verificación |
|---|---|---|
| P1 | **M3 = 100% sostenido ≥30 días** (M3a y M3b) | 30 snapshots consecutivos |
| P2 | **Gate `§3.2` completo**: los 9 criterios | Reportes firmados |
| P3 | **Playbook R3 ensayado** y **kill switch probado** en menos de 5 minutos 🔶 | Acta del drill |
| P4 | **Página de metodología con números del read-model real**, sin constantes | Revisión contra la query |
| P5 | **"Report a correction" con SLA comprometido y con ≥1 caso resuelto públicamente** | Ticket + página de correcciones |
| P6 | **Backup restaurado y probado**, con RTO/RPO conocidos | Acta del restore drill |
| P7 | **Owner humano nombrado** para incidentes, con horario declarado | Documento de guardia |

**Y la simétrica — no comprometer la promesa si:**

- [ ] el corpus está **por debajo de 300** → se comunica **cobertura real**, no un umbral (R5: por debajo del gate el claim es fino y la desconfianza llega antes que el tráfico).
- [ ] M4 <60% → no se dice "verificado"; se dice "con fecha de última verificación".
- [ ] el SLA de reporte no está cubierto por nadie → no se publica el enlace de reporte.
- [ ] no hay `curator` nombrado para el corpus → no se puede auditar, y lo no auditable no se puede defender ante U4.
- [ ] hay **cualquier incidente de confianza abierto** → la promesa está suspendida hasta que se cierre y se publique la corrección.

---

## 6. Matriz de decisiones con alternativas descartadas

> **Enfoque de esta tabla: no repetir la justificación de `discovery §10` ni de `architecture §9`, sino responder a una sola pregunta por fila: ¿qué señal del mundo nos haría revisar la decisión?** Una decisión sin señal de revisión es una dogma, no una decisión.

| # | Decisión | Elegida | Alternativas descartadas (consolidado) | Por qué la descartada es peor | **Señal que induciría a revisar** |
|---|---|---|---|---|---|
| **D1** | Forma del MVP | **Search-first**; globo fuera de MVP | Globe-first; catálogo primero; "todo en uno" | Globe-first optimiza J3 (menor frecuencia), la evidencia cartográfica dice que 3D **empeora** el lookup preciso, con cobertura parcial **miente visualmente**, y carga el móvil de U1 | **Los 4 criterios de `discovery §2.1`, todos**: ≥500 registros reales en ≥40 países · mejora medible frente al listado 2D en prueba con usuarios · rendimiento útil en móvil con fallback 2D robusto · no ocultar gaps. **Cualquiera de los 4 no cumplido → el globo no entra** |
| **D2** | Fuentes automatizadas | **Solo EACEA RSS**; Chevening solo curación manual hasta verificación legal | 3 automatizadas (plan original); DAAD; Fulbright; universidades | La matriz legal verificó 7 de 7 fuentes restantes como `DO-NOT-USE` o `AMBIGUOUS`. Automatizarlas no es una decisión de producto: es una decisión legal negativa, y sin departamento legal no se asume | **Q2 resuelta** (OGL/ToS de Chevening verificados) **o** permiso escrito de una entidad **o** aparición de un feed/API con licencia abierta. **Revisar también si el corpus de EACEA resulta demasiado pequeño (Q3)**: entonces el canal manual pasa a ser el único y hay que decirlo en la metodología |
| **D3** | Fuentes prohibidas | DAAD / universidades / Fulbright / studyineurope.eu: **no automatizar** | Scraping "responsable" de DAAD; catálogos de universidad | DAAD: todos-derechos-reservados + cadena de derechos de terceros + `/app/bsa/api/` en disallow + `robots.txt` de `www2` da 404. Fulbright/IIE: prohibición **explícita** de spiders y data mining. `studyineurope.eu`: **empresa privada**, no fuente de la UE | **Solo** permiso escrito por escrito y con fecha, o una API/feed oficial con licencia abierta. Nada de "es solo para datos públicos" |
| **D4** | Motor de estado | **Función pura**, 6 estados, no-`CLOSED`-on-failure, no-`OPEN`-from-fecha | `is_open` booleano; TTL con "último estado conocido"; estado oculto al usuario; inferir por calendario del ciclo | Un booleano **no puede expresar incertidumbre**, así que el código termina decidiendo por defecto. TTL sin `UNKNOWN` muestra un estado de hace 40 días con una confianza que no tiene — exactamente el daño que R3 prohíbe. Inferir por calendario es `OPEN`-from-fecha con otro nombre | **Ninguna señal del mundo.** Esta es la garantía central del producto (ADR-002). Solo se revisa si el modelo de evidencia cambia estructuralmente (p. ej. una fuente con estado explícito y fiable que la mayoría de los casos resuelve, lo que permitiría subir `confidence` media a alta) — **pero la estructura de 6 estados no se revisa** |
| **D5** | Identidad | Shortlist **anónima** sin login | Supabase Auth completo; SSO | El token anónimo cubre el 100% del job de MVP. Auth cuesta superficie de seguridad completa (sesiones, reset, CSRF, enumeración) y no compra **un solo byte de verificabilidad** | **Demanda medida** de accounts/cross-device (p. ej. >30% de las sesiones pierden la shortlist al cambiar de dispositivo). Antes de eso, la respuesta correcta es exportar la shortlist (S4), no crear cuentas |
| **D6** | Página de metodología | **Obligatoria**, pública | Occulta; solo en el footer; "sobre nosotros" genérico | Es la superficie que U4 necesita para defender lo que ve y la que nos hace defendibles ante R1/R9. Sin ella, "verificable" es una afirmación sin respaldo — el mismo problema que ADR-004 resuelve en los datos | **Ninguna.** Es el cheap insurance más rentable del producto. Solo cambia su **contenido** (qué cifras mostrar) |
| **D7** | Demo vs. real | `is_demo` + badge obligatorio, `prod` sin demo, `is_demo` inmutable | "Solo datos demo en el pitch"; "demo sin etiqueta, se nota por la URL"; flag por entorno | Una demo que parece real es la forma más rápida de perder el activo antes de tener activo. El badge no configurable por entorno es lo que hace la regla real | **Ninguna.** Si el badge de demo aparece en prod, eso es un **defecto**, no una señal de revisión |
| **D8** | Contenido | **Hechos + enlace**, no prosa copiada | Copiar la descripción del programa; "enriquecer" con un LLM | `legal-matrix §11` es explícito: *"An LLM is not a source"*. Rellenar campos destruye la única ventaja estructural del producto: no ser un agregador | **Ninguna.** Si aparece presión comercial para llenar un `amount` o un `eligibility` "porque la competencia sí lo hace", eso es R9 — deriva comercial, no un caso de negocio |
| **D9** | Monetización y lenguaje | **Cero** monetización, cero "garantizado", cero afiliación | Fee unlock; colocación pagada; lead-gen; programa propio | El incentivo a mostrar más de lo verificado destruye el activo. Es también lo **único que los incumbentes no pueden copiar** (R9) | **Cambio de modelo de negocio completo con una nueva junta/socio.** Eso no es una señal de revisión técnica, es una decisión de negocio que hay que tomar por separado y con honestidad |
| **D10** | Gate de fases | No implementar (Fase 9) hasta aprobar Fases 1–8 | Empezar a implementar en paralelo con el discovery | El discovery cambió el producto tres veces (globo fuera, 1 fuente en vez de 3, 6 estados). Código escrito antes de eso hay que tirarlo | **Ninguna.** Es la salvaguarda de este documento |
| **ADR-001** | MVP search-first + EACEA única | Ver D1 + D2 | Globe-first · framework de plugins · escapar a 3 fuentes automatizadas | Un framework de plugins con 1 fuente es 1 script escrito dos veces. Escapar a 3 fuentes viola D3 | Igual que D1/D2, pero además: si el gate `§3.2` **se cumple** y la coropleta 2D **no** genera descubrimiento medible, el globo entra en evaluación con los 4 criterios |
| **ADR-002** | Estados conservadores | 6 estados, `UNKNOWN` nunca colapsa a `CLOSED` | Ver D4 | Ver D4 | **Ninguna** (misma razón que D4) |
| **ADR-003** | SSRF-first | Frontera de fetch como **puerto**, allowlist exacta, pin de IP, redirects off | `fetch` nativo + validación previa · allowlist con comodín · validar IP sin pinear · confiar en el sandbox de la plataforma · proxy de salida | `fetch` nativo re-resuelve el hostname → TOCTOU, el error clásico. `*.europa.eu` deja pasar `evil-europa.eu.attacker.com`. Validar sin pinear deja la ventana abierta. El sandbox de plataforma no es un control auditable | **Opción A → Opción C de `architecture §11.3`** (worker con egress real) es la señal que induce a revisar: no porque la decisión sea mala, sino porque **elimina la clase de riesgo** en vez de gestionarla. Segunda señal: un **test negativo de SSRF que falle en CI** → bloqueo inmediato, no discusión |
| **ADR-004** | No inventar datos | Publicación condicionada a `source_url` + `last_verified_at` + `source_licence` por **`CHECK` de DB** | Rellenar con inferencia/modelo · validar el gate solo en la aplicación · fusionar `source_url` y `discovered_via` · eliminar el registro inválido | Un modelo no es una fuente. Validar solo en la aplicación deja que una ruta de escritura futura lo bypase. Fusionar descubrimiento y fuente es el mecanismo por el que un agregador se convierte en fuente de sí mismo. Borrar el inválido destruye el audit trail | **Ninguna.** Es el segundo pilar del producto junto a D4. Si aparece la tentación de "solo esta vez", eso es R8 + R9 |

**Consolidado — cómo se revisa una decisión:**

```
Señal detectada
 └─> ¿La decisión dice qué hacer con la señal?   (esta tabla)
 ├─ SÍ → revisar con PROD, documentar, cambiar o mantener con justificación
          └─ NO  → la decisión es un dogma. Corregir la tabla, no el código.
```

Las únicas con señal de revisión real: **D1, D2, D3, ADR-001, ADR-003**. Las otras seis (D4–D10, ADR-002, ADR-004) son restricciones del activo: revisarlas requiere **cambiar el producto**, no el umbral.

---

## 7. Handoff: Fase 2 → Fases 4–8

### 7.1 Principio de handoff

Cada fase siguiente recibe de Fase 2 **tres cosas**: (1) los criterios verificables que debe satisfacer, (2) las preguntas abiertas que le tocan cerrar, y (3) las restricciones que **no puede relajar sin volver a Fase 2**.

⚠️ **Honestidad sobre los nombres de fase:** el repo define explícitamente **Fase 4 (Data Strategy)**, **Fase 6 (Visual Direction)** y **Fase 7 (Technical Blueprint)** (`discovery §11`, `architecture §15`). Las **Fases 5 y 8 no tienen mandato nombrado en ningún documento**. Las trato abajo por su contenido inferido de `discovery §12` y lo marco 🔶.

### 7.2 Mapa de handoff

| Fase | Recibe de Fase 2 | Debe devolver | Preguntas §12 que cierra | Preguntas que deja abiertas |
|---|---|---|---|---|
| **Fase 4 — Data Strategy** 🔶 nombre verificado | §1.A (protocolo de curation, cadencia, Q1), §1.B (tabla de evidencia completa), §2.3 (M3c no computable), §4 (definiciones técnicas M3–M7), M-11 (`CHECK` de publicación), §5.4 (kill criteria) | Schema final con `CHECK`s, índices GIN, `sources.official_hosts` o equivalente, read-model de metodología que excluye `is_demo`, queries de M3–M7 como código de metrics | **Q3** (volumen real del corpus EACEA — spike técnico), **Q4** (volumen y cyclicidad para que el countdown sea fiable por zona) | Q1 (ritmo real de curación, se mide al ejecutar) |
| **Fase 5 — (mandato no nombrado) 🔶** | §1.E (copy aprobado, copy de vacío, copy de metodología, copy de cero-resultados), D-01/D-02/D-03 (métricas de 30 días), §3.2 (orden Should) | Especificación de estados de carga, flujos de error y vacío, y el primer diseño de la coropleta 2D honesta | **Q1** (en parte: validación de la factibilidad de curación con usuarios reales), **Q5** (junto a Fase 7) | — |
| **Fase 6 — Visual Direction** | E1–E5 del DoR, `discovery §9` (12 reglas anti-genéricas), **la tensión explícita de `discovery §11`: la paleta con glow/neón del plan inicial está en colisión con §9.6/§9.7** | Sistema visual donde la metadata de confianza gana la jerarquía, `UNKNOWN` nunca gris ni adyacente a `CLOSED`, y el deadline legible en móvil (§9.10) | — | Geometría de la coropleta: si el corpus queda en pocos países, ¿es honesto o parece cobertura total? → respuesta de Fase 2: **es honesto solo si los huecos se muestran explícitamente como "sin datos"** (`value-impact §4.2`) |
| **Fase 7 — Technical Blueprint** | §1.C (frontera de red, SSRF, kill switch), §4 (alertas y sus canales), D-02 (condición de reevaluación de embeddings) | Implementación ejecutable de los contratos de `architecture §8`, pipeline de §4.4, y **la decisión de `architecture §11.3`** ya resuelta por PROD | **Q5** (FTS basta o no) | — |
| **Fase 8 — (mandato no nombrado) 🔶** | §2 completo (DoD), §4.8 (alertas de anomalía), §5 (playbook R3) | Evidencia de que el DoD bloqueante está cumplido; drills ejecutados (kill switch, restore, tabletop R3, protocolo de curation) | Cierre de A1/Q1 | — |

### 7.3 Preguntas abiertas de `discovery §12` — quién las cierra, con qué artefacto

| # | Pregunta | Quién | **Artefacto que la cierra** | Cuándo |
|---|---|---|---|---|
| **Q1** | ¿Alcanzable ≥300 registros reales por curación manual en plazo razonable? | **Fase 4/5 + CUR + PROD** | Plan de curación fechado con ritmo medible (DoR **A1**) **+** primer corte de conteo real a las 4 semanas del plan | Antes de Fase 9 |
| **Q2** | ¿Verificable la licencia pública de Chevening (ToS/OGL)? | **LEG** | Informe fechado de la matriz legal: `HABILITABLE` / `AMBIGUOUS` / `DO-NOT-USE` | Antes de Fase 9 (DoR **D7**) |
| **Q3** | ¿Cuánto puede dar el corpus de EACEA RSS? | **Fase 4** | Spike: fixture archivado (A2) + conteo de ítems por tipo + **proyección de cuántos registros renewables produce al año** | Antes de Fase 9 |
| **Q4** | ¿Qué volumen y qué cyclicidad necesitan para que el countdown sea fiable por zona? | **Fase 4** | Análisis de la distribución de `deadline_basis` y de deadlines cerca de medianoche local → confirma o revisa `inferred_from_cycle` como base admisible | Antes de Fase 9 |
| **Q5** | ¿Búsqueda semántica (embeddings) o FTS puro basta? | **Fase 5/7** | Decisión registrada. 🔶 **Fase 2 recomienda el criterio de decisión**: FTS puro, y reevaluar solo con **M2 >10% en las20 intenciones de mayor volumen Y M1 ≥40%** durante 30 días | Post-lanzamiento |

### 7.4 Necesidades de Fase 3 (`architecture §15`) — dónde quedan resueltas

| # | Necesidad de Fase 3 | Dónde la resuelve Fase 2 |
|---|---|---|
| 1 | Traducir el DoD global a DoR/DoD verificable | §1 + §2 (+ §2.0.b para lo no verificable del repo) |
| 2 | M3–M7 como SLOs con umbral, ventana, condición de alerta y respuesta | §4 (completo) |
| 3 | Conflicto M5 vs. cobertura: ¿se relaja la regla o la expectativa? | §4.0 (**regla que atraviesa los SLOs**) + §4.3: **se ajusta la comunicación, nunca el dato** |
| 4 | Playbook R3 con kill switch por adapter | §5 (completo), con M-10/M-11 como DoD bloqueantes |
| 5 | Gate §3.2 vs. Q1 abierta: ¿se baja el gate o se retrasa? | §2.1 (M-01..M-09) + §5.4 **K12** + DoR **A1**: **no se baja el gate; se retrasa el lanzamiento o se declara cobertura real** |
| 6 | Prioridad de J3 vs. J1: ¿la coropleta de un subconjunto es honesta? | §3.1 + §7.2 (Fase 6): honesta **solo** si los huecos se muestran explícitamente |

### 7.5 Preguntas de `architecture §16` — estado tras Fase 2

| # | Pregunta | Estado tras Fase 2 |
|---|---|---|
| **Q-A** | Opción A o C de infraestructura | 🔶 **Sigue siendo del usuario.** Fase 2 no tiene competencia: es coste y riesgo operativo. Lo que sí hace es fijar que, si es A, las **6 mitigaciones son condición de DoR**, no buenas prácticas (DoR C8) |
| **Q-B** | Neon o Supabase | Abierta, sin impacto de valor |
| **Q-C** | ¿Publicar con 1 adapter + N curados, o esperar 3 automatizados? | ✅ **Resuelta: publicar con 1 adapter + N curados.** Esperar 3 automatizadas es imposible hoy (`legal-matrix`: 7 de 7 fuentes restantes `DO-NOT-USE`/`AMBIGUOUS`). Es la alternativa que `architecture §16` no podía decidir |
| **Q-D** | PostHog self-hosted vs. cloud EU | Abierta, con la restricción ya fijada por Fase 1: sin PII, sin query cruda, replay desactivado |
| **Q-E** | Frecuencia de re-verificación manual | 🟡 **Resuelta parcialmente:** la **cadencia por volatilidad** queda adoptada de `legal-matrix §11` y cuantificada como carga. Falta la **capacidad disponible** (horas-persona), que es una decisión de PROD y cierra el DoR **A5** |
| **Q-F** | ¿Retirar el requirements tracker `/discovery` de la ruta de escritura? | Abierta. Fase 2 no escribe en `docs/discovery/`; escribe aquí, y recomienda dejar `discovery.md` **inmutable** como documento citado (`architecture §15`) |

### 7.6 Lo que Fase 2 **no** entrega, y por qué es correcto

| No entregado | Por |
|---|---|
| Números de mercado, tráfico, volúmenes de palabras clave | `value-impact §9`: **no existen**. Inventarlos sería la forma más elegante de mentir |
| Métricas de outcome (becas conseguidas, dinero ahorrado) | Requieren seguimiento longitudinal, que choca con la decisión de no-PII. **No inventarlas** (`value-impact §6`) |
| Backlog de features de post-MVP detallado | El orden de `§3.3` es suficiente. Un roadmap de 30 ítems es R8 con otro nombre |
| Umbrales ajustados a la baja | Ningún umbral de este documento se relajó para hacer el gate más alcanzable. Donde había tensión, la resolutionsé cambiandometric, no el criterio |

---

## 8. ANEXO — Conflictos detectados, decisiones pendientes y límites de este documento

> Estos puntos **no** se resuelven aquí porque requieren una decisión del usuario o una decisión de schema. Se documentan para que no se pierdan y para que nadie asienta que ya están resueltos.

### 8.1 Conflictos internos del repo

| # | Conflicto | Tensión | Recomendación de Fase 2 | Quién decide |
|---|---|---|---|---|
| **C1** | `discovery §3.2` pide `source_url` resoluble **≥90%**; `discovery §7 M3` y ADR-004 exigen **100% por construcción** | Un `CHECK` de DB no produce 90%: produce 100% o nada. Mantener el 90% invites a usarlo como tolerancia | **Gana 100%.** Reescribir la fila del gate o eliminarla | PROD |
| **C2** | `discovery §3.1.9` dice "**3 integraciones de fuente**"; `D2` y ADR-001 dicen "**1 adapter**" | Confuso: "3 integraciones" puede significar 3 vías de ingesta o 3 automatizadas | **Reescribir**: "1 adapter automatizado + un normalizador compartido por el que pasan las tres vías de ingesta (feed, sitemap, curación manual)". Requisito real = tubería única | PROD + BACK |
| **C3** | `legal-matrix §11` fija seed scope de **15–50 programas**; `discovery §3.2` exige **≥300** agregados | No necesariamente contradictorio, pero el texto no lo aclara | Definir 15–50 como el **tier de mayor valor** y 300 como el **total**, por escrito. Si no, el gate y el protocolo dicen cosas distintas | **PROD** |
| **C4** | `value-impact §4.2` define **5** condiciones para el globo; `discovery §2.1` define **4** | La versión consolidada perdió el criterio medible más específico (≥20% de sesiones desde la vista geográfica → detalle) | Adoptar los **4** de `§2.1` como puerta y **añadir** las métricas de `value-impact §4.2` como protocolo de evaluación post-MVP | PROD |
| **C5** | `value-impact §5.2` incluye **cobertura de intención** (8 de 20); `discovery §3.2` la perdió en la consolidación | Un criterio barato y útil desapareció | **Restaurar** como DoD deseable D-03 (§2.2) | PROD |
| **C6** | **DoD global §11.1–11.4**: citado por `architecture §15`, **no existe en el repo** | No se puede verificar ni ajustar | Reconstrucción 🔶 en §2.0.b como punto de partida; **contrastar con el plan original** | **PROD** |
| **C7** | El ERD no tiene **registro de hosts oficiales**; M3b lo necesita | "Dominio oficial" no es un concepto computable sin tabla de referencia | `sources.official_hosts text[]` + denylist en descriptor | **DATA (Fase 4)** |
| **C8** | "Resoluble" (M3c) **no es computable por nosotros** sin rastrear a terceros | `security §3.2` (fair-use) vs. M3 medible | M3c es **humano y trazable**, no una query. Declarado explícitamente para que nadie lo "resuelva" construyendo un crawler | DATA + SEC |
| **C9** | Fases **5 y 8 sin mandato nombrado** | El handoff necesita destinatarios | Definir los mandatos o renombrar el plan | PROD |

### 8.2 Decisiones que este documento **propone** y requieren ratificación

| # | Propuesta | Base | Si se rechaza |
|---|---|---|---|
| P1 | **ES + EN en la UI** como bloqueo | `architecture AR-3` configura FTS en `spanish` mientras el corpus es mayoritariamente inglés y U2/U3/U4 operan en inglés; etiquetar en el idioma equivocado es un problema de confianza | Habrá que reconfigurar la FTS multilingüe y decidir a quién se sirve primero — decisión de producto, no de infraestructura |
| P2 | **N = 10** registros en el criterio de aceptación de `adapter.parse()` | Inferencia sobre el feed observado (~25 ítems, `architecture §1.3`) | Ajustar N tras el spike de Q3 |
| P3 | **Run `not_modified` (304) y `skipped_locked` excluidos del denominador de M7** | El repo no precisa la fórmula; contarlos como fallo produce falsa alarma diaria | M7 dispara falso positivo de forma sistemática; el SLO pierde valor de señal |
| P4 | **RTO/RPO y cadencia de re-verificación** se fijan tras el restore drill y el cálculo de carga | `architecture AR-14`, `legal-matrix §11` | No se puede afirmar nada sobre recuperación ni sobre sostenibilidad del corpus |
| P5 | **Ningún umbral relajado** para hacer alcanzable el gate | `discovery §8 R1`: menor volumen, mayor defendibilidad | — (es una regla, no un parámetro) |
| P6 | **1 sola entry en la allowlist** durante todo el MVP | `architecture §11.3` mitigación 1 | La superficie SSRF crece y el riesgo se gestiona con más software en vez de menos superficie |

### 8.3 Límites de este documento (declarados, no resueltos)

- **Sin research primario.** Las personas U1–U4 son construidas a partir de comportamiento observado de productos comparables (`value-impact §9`). Diez entrevistas reordenarían J1 vs. J3 inmediatamente. **Ningún umbral de este documento está validado con usuarios.**
- **Sin datos de tráfico.** D-01 (M1), D-02 (M2), D-03 (intenciones) y D-04 (M8) **no pueden evaluarse antes de 30 días de tráfico real**, y sus umbrales son propuestas defendibles, no benchmarks.
- **Sin outcomes.** Por decisión de no-PII, **no podemos probar que el producto sirva para conceder una beca**. Ese es el trade-off explícito y se mantiene: se afirma la verificabilidad (que es lo comprobable), no el resultado (que no lo es).
- **El corpus de EACEA es un feed de delta acotado** (`architecture AR-1`, verificado): **no se renueva solo**. El gate de 300 depende, por tanto, de la curación manual, no del adapter. El adapter es mantenimiento y detección de cambios, no relleno.
- **Q1 sigue abierta** y es el riesgo mayor del calendario. No hay aquí ningún número de "cuántos registros por hora" porque **no hay ninguna medición de ese ritmo todavía**.

### 8.4 Lo que este documento se compromete a no hacer

1. **No relajar un umbral** para que el gate sea alcanzable.
2. **No llamar "verificado"** a nada que no tenga `source_url` + `last_verified_at` + un curador con nombre.
3. **No rellenar un campo** para que una captura de pantalla se vea mejor.
4. **No contar registros** como medida de éxito.
5. **No inventar** una métrica de impacto que no se pueda calcular desde Postgres + PostHog + Sentry.

---

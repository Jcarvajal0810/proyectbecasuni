# Discovery — Consolidado (Fase 1)

> Documento de referencia único para las fases 2–8.
> Fuentes: `value-impact.md`, `legal-matrix.md`, `security-baseline.md` (mismo directorio).
> Fecha: 2026-09-30 · Estado: aprobado por el usuario para continuar a Fase 2/3.

---

## 0. Resumen ejecutivo

| Ámbito | Hallazgo | Consecuencia para MVP |
|---|---|---|
| **Valor** | El problema real no es *descubrir*, es **verificar**: que la convocatoria exista, que esté abierta en el ciclo actual y que el deadline sea real. | Posicionar como **conjunto de datos trazable**, no como "el agregador más grande". |
| **UX / Alcance** | El **globo 3D no se gana su lugar en MVP**. Optimiza el trabajo de menor frecuencia y front-loada el componente de mayor riesgo. | **MVP search-first**. Globo post-MVP, condicionado a 4 criterios medibles. |
| **Seguridad** | El corpus de terceros es **entrada no confiable**. Riesgos dominantes: SSRF, XSS almacenado, *data poisoning*. | Allowlist exacta por adapter, bloqueo de IPs privadas/metadatos, cero `dangerouslySetInnerHTML`, sin fetch de URL supplied por usuario. |
| **Legal** | Solo **1 fuente** resulta claramente habilitable para automatización (RSS acotado). Chevening es ambiguo/no verificado. DAAD, universidades, Fulbright, studyineurope.eu: no automatizar. | **MVP: 1 adapter automatizado (EACEA RSS) + curación manual identificada.** |

**Decisiones que rigen todo lo demás:**

1. La fuente oficial prevalece. `source_url` = página oficial del programa. Agregadores solo para descubrimiento, nunca como fuente del registro.
2. `robots.txt` no es licencia. Silencio = **AMBIGUOUS** = no automatizar.
3. Ante fallo de verificación → `UNKNOWN`. Nunca `CLOSED` por timeout, 404, parser roto o CAPTCHA.
4. Nunca `OPEN` por fecha futura. Conservar `LAST_KNOWN_STATUS` + `last_verified_at` + confianza.
5. Dato faltante → `No publicado` / `No especificado`. Cero invención.
6. Demo y real nunca se mezclan silenciosamente (`is_demo` + badge visible).

---

## 1. Problema y propuesta de valor

### 1.1 Fallos concretos de las opciones existentes

| Fallo | Consecuencia para el usuario |
|---|---|
| Datos desactualizados sin aviso | Pierde plazos o postula a convocatoria cerrada |
| Sin fuente identificable por registro | No puede verificar nada antes de invertir horas |
| Estado (abierta/cerrada) ambiguo o ausente | Tiene que re-visitar N portales para confirmar |
| Ruido de agregadores (listados copiados) | Desconfianza; imposible distinguir oficial de replicado |
| Sin descubrimiento geográfico | No sabe qué países realmente ofrecen oportunidades a su perfil |
| Sin histórico de cambios | No puede saber si una info es nueva o lleva meses obsoleta |

### 1.2 Job To Be Done (priorizados)

| # | Job | Usuario | Workaround actual | Por qué falla |
|---|---|---|---|---|
| **J1** | "No dejarme pasar una fecha límite" | Todos | Alertas del portal oficial, calendario | La fuente no siempre notifica; el aviso llega tarde |
| **J2** | "Probar que este anuncio es real antes de invertir tiempo" | Todos | Google + wary de estafas | No hay `source_url` confiable visible en la mayoría de listas |
| **J3** | "Entender mis opciones geográficas y por área" | Estudiantes | portals por país | Ninguna vista comparativa de cobertura real |
| **J4** | "Darle a mis asesorados una lista accionable" | Orientadores | Hojas de cálculo propia | Sin estado ni freshness; cada asesor re-verifica a mano |

### 1.3 Usuarios

| Persona | Contexto | Implicación de diseño |
|---|---|---|
| **U1 — Lucía, 20, pregrado (Colombia)** | Móvil de gama media, Few, ansiosa por deadlines, sin((*) | Deadline legible a brazo largo; móvil primero en listas; cero fricción (sin login) |
| **U2 — Kwame, 29, profesional (Nigeria)** | Desktop, postgrado, compara opciones y funding | Filtros por financiación/monto; verificación explícita antes de aplicar |
| **U3 — Dra. Ana, 34, PhD (México → Alemania)** | Desktop, INVESTIGA en DAAD/(programas), funding detail | Búsqueda por área/investigación; source-of-truth crítico; funding desglosado |
| **U4 — Patricia, 48, asesora financiera** | Desktop, riesgo reputacional con estudiantes | Criterios metodológicos públicos; exportación; confianza verificable |

**Insight transversal:** este público es **ansioso, sensible a plazos y desconfiado de datos inventados**. La transparencia (fuente + última verificación) es requisito de confianza, no un extra.

---

## 2. Auditoría valor vs complejidad

### 2.1 El globo 3D: veredicto

**Respuesta defendida: el globo no es necesario para el MVP, y su lugar debe condicionarse a evidencia.**

- La literatura cartográfica muestra que los usuarios **prefieren** displays 3D realistas pero **rinden peor** en tareas de lookup preciso (ICA-ABS 2018; Tory et al., IEEE TVCG 2006). Buscar una beca es un lookup preciso.
- Un mapa con glow y puntos sugiere **cobertura total**. Con ~300 registros eso es cobertura parcial: el efecto visual **contradice la honestidad del dato**.
- Un mapa 2D TopoJSON (coropleta + faceta por país) **muestra los huecos de cobertura con honestidad**, y de paso cumple los criterios de accesibilidad y móvil.

**Condiciones para reevaluar el globo (las 4 deben cumplirse; si no, se descarta):**

1. ≥500 registros reales verificables en ≥40 países.
2. Demostrar mejora medible en descubrimiento frente al listado 2D (prueba con usuarios, no opinión).
3. Mantener rendimiento útil en móvil con fallback 2D robusto.
4. No ocultar los gaps de cobertura.

### 2.2 Over-engineering a recortar del MVP

| Descartar | Motivo |
|---|---|
| Arquitectura de plugins de adapters | Con 1–3 fuentes, 3 scripts + 1 normalizador bastan |
| Supabase Auth completo | Un token anónimo + shortlist guardada cubre el MVP |
| Motor genérico de jobs | Cron + cola simple por fuente |
| Dedupe automático fuzzy | Riesgo de fusionar programas distintos; manual + exacto en MVP |
| Score de compatibilidad / matching | No es diferenciador y complica la confianza |
| Digest por email | Prematuro hasta probar corrección de deadlines |

---

## 3. Alcance

### 3.1 Must-Have (MVP)

> **Una frase:** buscar becas verificadas, ver quién las publica y cuándo se comprobó por última vez, saber exactamente cuántos días quedan, y no decir nada que no podamos respaldar.

1. **Dataset semilla verificable** (umbral en §3.2).
2. **Búsqueda + filtros**: nivel, área, país de destino, tipo de financiación, ventana de deadline, estado. Postgres FTS sobre título + entidad + descripción.
3. **Resultados con variables de decisión primero**: estado, días restantes, fecha límite + su base, entidad, monto (`No especificado` si falta), dominio fuente.
4. **Detalle**: campos completos con `No publicado` explícito, enlace a fuente oficial prominente, `last_verified_at` en la zona del usuario, motivo cuando `UNKNOWN`, y nota en lenguaje claro que distingue *deadline de beca* de *deadline de admisión universitaria*.
5. **Motor de estado**: 6 estados, fuente explícita gana, no CLOSED-on-failure, no OPEN-from-fecha, `LAST_KNOWN_STATUS` preservado. Función pura + suite de tests que cubre **todas** las rutas de fallo.
6. **Shortlist anónima** (token, sin login) + URL compartible de solo lectura.
7. **Página pública de metodología**: cuántos registros, cuántas fuentes, cuándo fue el último run, qué significa "verificado", qué **no** afirmamos.
8. **Monitor de enlaces/frescura**: por fuente, último éxito y última vez que cambió un estado; un registro no re-verificado en N días **envejece visiblemente**.
9. **3 integraciones de fuente + normalizador compartido**, elegidas por estabilidad programática y claridad de licencia (no por fama).
10. **Anti-abuso básico**: sin ruta de pago, sin lenguaje "garantizado", sin enlaces de afiliado, checklist de señales de estafa.

### 3.2 Qué significa "suficientes oportunidades"

**Es un umbral de cobertura y confianza, no un conteo de registros.** Más registros sin verificar empeoran el producto.

Criterios de gate (todos deben cumplirse para declarar el MVP probado):

| Métrica | Umbral |
|---|---|
| Registros reales (no demo) | ≥300 |
| Países de destino | ≥20 |
| Dominios fuente distintos | ≥15 |
| Registros con `source_url` resoluble en dominio oficial | ≥90% |
| Registros publicados con `last_verified_at` no nulo | **100%** |
| Verificados en los últimos 14 días | ≥80% |
| En `UNKNOWN` entre registros `OPEN`/`UPCOMING` | ≤5% |
| Tasa de duplicados (`duplicate_group_id` con >1 miembro / publicados) | ≤2% |
| Ciclos anuales actuales presentes | ≥3 de los 5 programas de mayor volumen, verificados a mano ≤7 días tras apertura |

**Test estacional de verdad:** el ciclo anual de Chevening (apertura en septiembre, observado) es el evento natural de prueba.

**Sobre la semilla:** la curación manual es una estrategia legítima de MVP, no un parche. Para ~300 registros con 2–4 campos, la entrada manual cuidadosa con `source_url` y `last_verified_at` obligatorios puede ser **más fiable y más rápida** que construir infraestructura de extracción. La automatización es para mantenimiento, no para el llenado inicial.

### 3.3 Should-Have (post-MVP, en orden)

1. Seguimiento de estado de postulación por item guardado (saved / preparando / postulado / resultado) — la mejor expansión de J1.
2. Digest de deadlines (email/WhatsApp) una vez probada la corrección.
3. Páginas por entidad/funder (p. ej. "todas las becas Chevening") — SEO y superficie de confianza.
4. Exportación de shortlist (CSV / imprimible) para asesores.
5. Comparador de 2–3 oportunidades (útil cuando la decisión es real, no como función permanente).
6. Correo de phosphorylation de enlaces + explicación cuando algo cambia.
7. **Globo/coropleta** sujeto a los 4 criterios de §2.1.

### 3.4 Nice-to-Have

Score de ajuste (si se demuestra útil), mapa de calor de concentración, i18n, PWA, exportación a calendarios.

### 3.5 Explícitamente fuera de alcance en MVP

Auth con email/SSO · notifications · pipeline de postulación · panel admin más allá de una vista interna de estado · modelo de matching · scraping masivo · mobile app nativa · comparador permanente · monetización de cualquier tipo.

### 3.6 Variantes de MVP

| Variante | Descripción | Veredicto |
|---|---|---|
| **A — Search-first** | Búsqueda + filtros + detalle + transparencia como núcleo; geografía como faceta y coropleta 2D | **RECOMENDADA**: maximiza valor verificable, minimiza riesgo, no sugiere cobertura inexistente |
| **B — Globe-first** | Globo como home y flujo principal | Rechazada: front-loada el riesgo más alto y el trabajo de menor frecuencia |

---

## 4. Estrategia de datos

### 4.1 Modelo (consolidado con legal + seguridad)

Campos base acordados en el plan, más los que security/legal exigen explícitamente:

```text
scholarships
- id (uuid pk), slug (unique)
- title, provider, university
- country_iso2, country_iso3, country_name
- level, fields[], modality
- funding_type, amount (nullable), currency (nullable), coverage[]
- official_url, application_url
- source_name, source_url
- source_licence, discovered_via, legal_clearance   <- exigidos por legal
- source_status, internal_status
- status_confidence, status_reason
- last_known_status, last_known_status_at
- opening_date, deadline_at, deadline_basis, deadline_tz, deadline_raw_text
- last_verified_at, source_last_updated_at
- first_seen_at, last_seen_at
- is_demo, is_published, needs_review
- duplicate_group_id
- notes_internal                                <- nunca expuesto al público
```

**Campos que NUNCA se exponen públicamente:** `notes_internal`, `legal_clearance`, `needs_review`, `discovered_via`, payloads crudos, logs de fetch, flags de admin.

### 4.2 Campos obligatorios para publicar

Un registro no se publica si no tiene: `source_url` resoluble en dominio oficial **y** `last_verified_at`. Sin ellos, el registro existe pero no se muestra como oportunidade válida.

### 4.3 Motor de estado (6 estados)

| Estado | Definición | Origen permitido |
|---|---|---|
| `OPEN` | Convocatoria activa | Fuente explícita, o deadline vigente **y** fuente sin contradicción |
| `CLOSED` | Cerrada | **Solo** evidencia explícita de la fuente, o deadline vencido + fuente confirma/no contradice |
| `UPCOMING` | Anunciada, aún no abierta | Fuente con fecha de apertura futura explícita |
| `EXPIRED` | Vencida, sin señal de reapertura | Fecha pasada + fuente no afirma apertura |
| `PAUSED` | Suspendida | Fuente explícita |
| `UNKNOWN` | **No pudimos verificar ahora** | Error de red, timeout, 5xx, 404, parser roto, CAPTCHA, bloqueo, challenge |

**Reglas no negociables:**

| Situación | Resultado |
|---|---|
| Fuente dice "Applications closed" | `CLOSED` |
| Timeout / 5xx / 503 / fetch falló | `UNKNOWN` + preservar `LAST_KNOWN_STATUS` |
| 404 o cambio de DOM | `UNKNOWN` + `needs_review` |
| CAPTCHA / 403 / 429 | `UNKNOWN` + `needs_review`, **nunca** escalar ni evadir |
| Fecha futura sin estado explícito | `UPCOMING` o `UNKNOWN`, **nunca** `OPEN` |
| Duda general | `UNKNOWN` |

Implementación: **función pura** `resolveStatus(evidence) → {status, confidence, reason}`. Sin I/O. Testeable exhaustivamente. Esto es lo que garantiza que un fallo de red jamás pueda producir `CLOSED`.

### 4.4 Deadlines y timezone

- Almacenar `deadline_at` (ISO con tz) **+** `deadline_basis` (`publisher_stated` / `inferred_from_cycle` / `unknown`) **+** `deadline_raw_text` verbatim **+** `deadline_tz`.
- **Renderizar countdown solo si la base es conocida.** Nunca calcular "días restantes" desde un cutoff asumido.
- Mostrar siempre la fecha absoluta del editor. `tabular-nums` para todo dato temporal.
- **Nunca mostrar countdown en registros `UNKNOWN`.**

### 4.5 `UNKNOWN` es un estado de producto, no un fallback

Riesgo R7: si `UNKNOWN` se ve gris o adyacente al badge de `CLOSED`, el usuario lo leerá como cerrada — **peor que no saber**. Reglas:

- Nunca gris. Nunca adyacente a `CLOSED` en la jerarquía visual.
- Copy propio y tranquilizador: *"No verificable ahora · Última verificación: hace N días"* + enlace a la fuente.
- Es la señal para que el usuario **haga clic en la fuente oficial** (que es lo correcto).

---

## 5. Estrategia de fuentes reales (matriz legal)

### 5.1 Veredictos

| Fuente | Veredicto | Método | Base |
|---|---|---|---|
| **EACEA / Erasmus Mundus Catalogue** ([eacea.ec.europa.eu](https://www.eacea.ec.europa.eu/)) | **`HABILITABLE`** | **RSS** [`node/253/rss_en`](https://www.eacea.ec.europa.eu/node/253/rss_en) + sitemap. Extraer **solo metadatos del feed**; enlazar siempre a la URL oficial del programa/consorcio. | Feed acotado y oficial; contexto CC BY 4.0 (Comisión Europea); menor ambigüedad de redistribución |
| **Chevening** ([chevening.org](https://www.chevening.org/)) | **`AMBIGUOUS` / `UNVERIFIED`** | **Solo curación manual** en MVP. No automatizar. | `robots.txt`, ToS, Privacy y sitemap agotaron timeout en la revisión. OGL v3.0 solo hallada en [`asams.chevening.org/terms`](https://asams.chevening.org/terms) (sistema distinto). Licenciamiento de listados públicos sin verificar |
| **DAAD** ([daad.de](https://www.daad.de/es/)) | **`DO-NOT-USE`** | Ninguno (solo enlace) | Avisos de todos-derechos-reservados, cadena de derechos de terceros, restricciones en `/app/bsa/api/`, `www2.daad.de/robots.txt` → 404 en la verificación |
| **Universidades (genérico)** | **`DO-NOT-USE`** por defecto | Solo con **permiso escrito**, caso por caso | Términos por institución. Oxford `Crawl-delay: 20`; Cambridge con preocupación explícita; Melbourne con prohibición explícita |
| **Fulbright / IIE** | **`DO-NOT-USE`** | Ninguno | Prohíben explícitamente spiders, data mining, reproducción, almacenamiento, análisis y distribución automatizados |
| **[studyineurope.eu](https://studyineurope.eu/)** | **`DO-NOT-USE`** | Descubrimiento solo vía el portal oficial de la UE | **No es fuente oficial de la UE**: empresa comercial privada. Términos prohíben copia y scraping comercial. Sustituto: [education.ec.europa.eu/study-in-europe](https://education.ec.europa.eu/study-in-europe) |
| **[education.ec.europa.eu/study-in-europe](https://education.ec.europa.eu/study-in-europe)** | Aceptable como **descubrimiento/referencia** | Solo descubrimiento. Nunca republicar su contenido como `source_url` | CC BY 4.0. Requiere atribución y mención de cambios |

### 5.2 Shortlist para MVP

1. **#1 — EACEA Erasmus Mundus RSS.** Habilitable, acotado, trazable, menor ambigüedad legal. **Primer adapter real.**
2. **#2 — Chevening por curación manual + solicitud de permiso.** Alto valor, pero no automatizable hasta resolver la verificación legal del sitio público.

> **Realidad operativa:** con el veredicto legal actual, alcanzar el umbral de §3.2 (≥15 dominios fuente) **no es alcanzable de forma automatizada**. La vía honesta es: automatización para EACEA + **curación manual identificada y atribuida** para el resto hasta obtener permisos. El contenido curado a mano sigue siendo dato real y verificable, siempre con `source_url` y `last_verified_at`.

### 5.3 Política de source-of-truth

Regla confirmada y refinada:

1. `source_url` = página oficial de la entidad/programa. **Nunca** un agregador.
2. Los agregadores sirven **solo para descubrir**. Cada registro terminado debe apuntar a su fuente oficial.
3. `discovered_via` registra cómo lo encontramos (feed, sitemap, curación manual, permutation de búsqueda).
4. Unknown/unverifiable → **no publicar**.

### 5.4 Baseline legal obligatorio por adapter

**A. Clearance:** permiso explícito o feed/API/documento de datos abiertos verificado. Licencia identificada. redistribution permitida o—we store facts + link, not copied prose—documentado. Verificación legal fechada. Owner asignado.
**B. Datos personales:** cero PII de solicitudes. Prohibidos datos de solicitantes, holders, alumni, contactos, estados de aplicación o entrevistas. Nada de emails de contacto en registros.
**C. Contenido y licencia:** se almacenan **hechos + enlace**, no descripciones largas copiadas. Atribución renderizada desde `source_licence`. Indicator de cambio cuando se use contenido CC BY.
**D. Operativo:** rate limit, `User-Agent` identificable, datos de conexión no persistidos.

### 5.5 Disclaimer obligatorio en la UI

- **Por registro:** `Fuente: {source_name}` + enlace a la fuente oficial + `Verificada {relative time}`.
- **Nota deSin afiliación:** "No estamos afiliados a las entidades listadas. La información se muestra con fines informativos y puede no estar actualizada. Consulta siempre la fuente oficial antes de postular."
- **Nunca decir:** "garantizado", "100% verificado", "becasrdf válidas", ni nada que sugiera aprobación por parte de la entidad.

### 5.6 Estrategia para fuentes AMBIGUOUS

El camino honesto y compatible: **dataset semilla curado a mano** con atribución de curador + verificación humana periódica (calendario fijo), más una escalera de escalamiento: (1)Curación manual, (2) solicitud escrita de permiso/API a la entidad, (3) mantener solo enlace en el sitio sin reproducir datos, (4) retiro si no hay permiso. No se intentará eludir controles de acceso, y se publicarán correcciones cuando nos equivoquemos.

---

## 6. Baseline de seguridad

### 6.1 Top riesgos

| # | Riesgo | Severidad | Mitigación obligatoria |
|---|---|---|---|
| 1 | **SSRF vía adapters / URLs derivadas de fuentes** →.metadata cloud y servicios internos | **Crítica** | Allowlist **exacta** de hosts por adapter (sin comodines). Bloquear loopback, RFC1918, link-local (incl. `169.254.169.254`), CGNAT, multicast, reservados. Revalidar en **cada** redirect y **tras** resolver DNS; **pin de conexión a la IP validada** (cierra DNS-rebinding/TOCTOU). Timeouts + tope de tamaño. **Nunca** un endpoint público que acepte una URL y la descargue |
| 2 | **XSS almacenado (contenido 3P)** | **Alta** | Todo el corpus es texto no confiable. Cero `dangerouslySetInnerHTML` sobre contenido de fuentes. CSP estricto (sin `unsafe-inline`), Trusted Types, render solo texto, `rel="noopener noreferrer"` en enlaces externos |
| 3 | **Data poisoning** (fuente con bug marca becas como cerradas) | **Alta** | Es un problema de **seguridad del usuario**, no de calidad: la gente postula sobre ese dato. Estado solo desde campos allowlisted, sanity checks de fechas, provenance por campo, cola `needs_review`, audit trail append-only, sin borrado silencioso, dedupe conservador que nunca fusiona programas distintos |
| 4 | **Secrets en bundle o repo** | **Alta** | Prohibición de `NEXT_PUBLIC_*` para secretos **validada en CI**, no por convención. Runbook de fuga ensayado. Permisos mínimos, rotación |
| 5 | **Endpoints de job/admin sin autenticar** | **Alta** | Secreto firmado o token fuerte, nunca adivinable. Rechazo sin firma válida |
| 6 | **IDOR en shortlists** | **Alta** | Ownership derivado de la sesión, scoping en la query, tests de privilegio horizontal en cada ruta |
| 7 | **Scraping descontrolado** | **Alta** | Limites por dominio, cola de prioridad, nunca refetch del corpus completo, circuit breaker, sin evasión de CAPTCHA |
| 8 | **Fuga de campos internos por API/caché** | **Alta** | Allowlist de serialización. Claves de caché compartidas **nunca** incluyen datos privados |

**Restricciones arquitectónicas** (baratas en Fase 7, caras de rediseñar después):
- El worker de sync debe correr en un entorno **sin ruta hacia la dirección de metadatos**.
- El cliente **nunca** recibe el objeto ORM completo: solo campos serializados de UI.

### 6.2 Controles de scraping responsable

Por dominio y por adapter: `User-Agent` descriptivo con contacto · rate limit · tope de concurrencia · delay mínimo entre peticiones · backoff exponencial **con jitter** · circuit breaker · peticiones condicionales (`ETag` / `If-Modified-Since`) · caché · horarios de baja carga · cumplimiento de `robots.txt` (con el aviso de que no es licencia) · sin evadir CAPTCHAs ni controles de acceso · detección de 403/429/5xx/páginas de challenge → `UNKNOWN` + `needs_review` · **log de cada decisión de fetch**.

Fair-use: minimizar páginas descargadas · preferir feed/API/dataset cuando exista · re-verificar solo lo que lo necesita (cola de prioridad) · nunca re-descargar el corpus en cada run.

### 6.3 Bloqueantes antes de habilitar un adapter en vivo

Un adapter **no** se habilita hasta que las 8 condiciones se cumplan:

1. Allowlist exacta de hosts definida y aplicada; redirects deshabilitados o revalidados por salto.
2. Chequeos SSRF de IP resuelta implementados **y probados** contra `127.0.0.1`, `10/8`, `172.16/12`, `192.168/16`, `169.254.169.254`, `100.64/10`, `::1`, `fc00::/7`, `fe80::/10`, y un escenario de DNS-rebinding. Cualquier fallo aquí bloquea el lanzamiento.
3. Límites de scheme, content-type, tamaño y timeout configurados para ese adapter.
4. `robots.txt` revisado; User-Agent con contacto; rate limit, tope de concurrencia y circuit breaker configurados; almacenamiento de `ETag` listo.
5. Guardas de integridad activas: campo de estado allowlisted, sanity checks, provenance, `needs_review`, audit trail, sin borrado silencioso, dedupe conservador.
6. Chequeo legal/política: contenido público y redistribuible; sin control de acceso que eludir.
7. Owner asignado y logging de decisiones de fetch verificado.
8. Si requiere credenciales: secreto por fuente, cifrado, con alcance, owner de rotación nombrado.

---

## 7. Métricas de éxito

Todas calculables desde Postgres + PostHog + Sentry. Ninguna requiere panel de terceros.

| # | Métrica | Definición | Umbral propuesto | Cómo se mide |
|---|---|---|---|---|
| M1 | **Search-to-action** | Sesiones con ≥1 búsqueda que llegan al detalle y clic en la fuente oficial / sesiones con búsqueda | ≥40% | Funnel `search_submitted → detail_viewed → source_outbound_click` |
| M2 | **Zero-result rate** | Intenciones de búsqueda distintas con 0 resultados / total | ≤10% en las top-20 | `search_events`: query normalizada + result count |
| M3 | **Tasa de fuente verificable** | Publicados con `source_url` resoluble en dominio oficial / publicados | **100%** (sin `source_url` no se publica) | SQL + **restricción bloqueante** en el pipeline |
| M4 | **Frescura de estado** | Publicados con `last_verified_at` en 14 días / publicados | ≥80%; alerta si <60% | SQL por `source_id`, expuesto en la página de metodología |
| M5 | **`UNKNOWN` en accionables** | `internal_status='UNKNOWN'` con `source_status ∈ (OPEN, UPCOMING)` / total que afirman estar abiertos | ≤5% | SQL. **Es la cohorte donde un estado equivocado hace daño** |
| M6 | **Tasa de duplicados** | Publicados en un `duplicate_group_id` con >1 miembro / publicados | ≤2% | SQL, expuesto como estadística de transparencia |
| M7 | **Éxito de sync** | Fetches con payload parseable Y estado reconocido / intentos, por fuente, 7 días | ≥90% por fuente; <70% por 3 días seguidos = alerta | `sync_runs`: `source_id, started_at, outcome, parse_ok, status_extracted, record_count` |
| M8 | **Usuarios que regresan** | Usuarios con ≥2 sesiones en 14 días / usuarios con 1 sesión | ≥25% | PostHog o tabla first-party |

**Métricas explícitamente NO son de éxito:** conteo de registros, page views, shares. Son las que permiten que un agregador de baja confianza parezca exitoso.

**No medible en MVP:** resultados reales de becas, dinero ahorrado, admisiones conseguidas. Requieren contacto longitudinal, que choca con la decisión de no-PII. Si se quieren, preguntar vía auto-reporte opcional y desvinculado. **No inventarlas.**

---

## 8. Riesgos de valor

| # | Riesgo | Mitigación / trade-off |
|---|---|---|
| **R1** | **Legal / ToS** — republicamos contenido de terceros y hacemos afirmaciones sobre deadlines que afectan decisiones reales | Fuentes con términos permisivos o datos abiertos; respetar robots y rate limits; **almacenar hechos + enlace**, no prosa copiada; página de provenance por fuente; aceptar **menor volumen, mayor defendibilidad** |
| **R2** | **Churn de markup** — sin API estable, los portales cambian layout. Si el sync degrada en silencio, todo estado se vuelve suposición | Métricas por fuente (M7), `UNKNOWN` al fallar, envejecimiento visible en UI, y posición explícita: una fuente degradada **se retira de las vistas "abiertas"**, nunca se adivina |
| **R3** | **Erosión de confianza (riesgo terminal)** — un "ABIERTA · 3 días restantes" sobre algo cerrado cuesta una postulación y termina la relación | No negociable: nunca inferir, siempre fechar, siempre enlazar, nunca rellenar en silencio. **Cualquier incidente de confianza es un defecto Sev-1.** Publicar correcciones |
| **R4** | **Conflicto SEO** — competir por *"DAAD scholarship deadline 2027"* nos pone **por encima del portal oficial en sus propios programas**: peor para el usuario y riesgosamente legal | Posicionarse en long-tail y consultas de cobertura comparativa que podemos ganar honestamente; canonical/noindex donde proceda; **concedir explícitamente las head queries** |
| **R5** | **Cold start** — con <300 registros el producto y el claim son finos | Umbral de §3.2; afirmación visible de cobertura actual; profundidad en pocos países antes que tokens en muchos |
| **R6** | **Timezone de deadlines** — fechas sin hora invitado a errores de ±1 día; UTC ≠ expectativa local | Almacenar fecha + base + tz; countdown solo con base conocida; texto literal del editor; nunca countdown asumido; nunca countdown en `UNKNOWN` |
| **R7** | **`UNKNOWN` leído como `CLOSED`** | Estado de primera clase, humano y tranquilizador. **Nunca gris. Nunca adyacente al badge de `CLOSED`.** Medir M5 y observar si los usuarios clic en la fuente desde `UNKNOWN` — si lo hacen, el estado funciona |
| **R8** | **Gravedad de alcance** — globo, matching, notificaciones: atractivos y no diferenciadores | Gate escrito de §3.2. Toda adición debe nombrar el fallo que corrige. *"Se ve impresionante"* no es un fallo |
| **R9** | **Deriva comercial** — el vertical tiene un patrón documentado de monetizar la ansiedad | Postura de no-monetización escrita y publicada. Es a la vez ética y competitiva: lo único que los incumbentes no pueden copiar |
| **R10** | **Decaimiento silencioso de cobertura** — las fuentes se pudren, los ciclos cierran | Publicar frescura (M4), alertar el decaimiento, declarar la cobertura honestamente |

---

## 9. Anti-genérico: reglas para el equipo

Reglas de decisión, no consejos de decoración. Existen para que el producto no se lea como plantilla sin costar claridad.

1. **La metadata de confianza supera a la promocional** en la jerarquía visual. Estado, dominio fuente y fecha de verificación ocupan la zona de máxima atención de cada item. El monto y las imágenes nunca. Si un layout no puede mostrar ambos, gana la confianza y **el layout está mal**.
2. **Nada de geografía decorativa** que el usuario pueda confundir con un lugar: fotos de campus de stock, banderas de adorno. La única geografía visual permitida es la coropleta de datos.
3. **Sin ilustración inventada de algo real.** Si un programa no tiene logo ni banner, el item no tiene imagen.
4. **Vacío es un estado diseñado con copy real.** "No especificado" no es un placeholder: es una afirmación que hacemos a propósito, y debe verse así.
5. **Los números aparecen solo si los podemos sustentar.** Sin "10.000+ becas" sin query que lo respalde. Sin contadores que inflen.
6. **Un color de acento, reservado para estado y acción.** Los colores de estado son semánticos, nunca decorativos. Sin gradientes como identidad, sin glassmorphism en superficies de datos, sin hero purple→blue.
7. **Tipografía y layout sobre efectos.** La identidad viene de una escala tipográfica real, tablas densas pero legibles e IA distintiva — no de apilamiento de sombras ni animaciones de scroll. Motion solo donde explica un cambio de estado.
8. **Sin hero genérico.** El contenido primario del landing es una búsqueda funcionando con registros reales y fechados — no un titular, ni un "Confiado por 50.000 estudiantes" que no podemos verificar.
9. **La honestidad supera al pulido en cada review.** Un PR que parece la referencia pero inventa un campo es una regresión. Un PR que se ve plano pero es totalmente trazable es una mejora.
10. **Probar cada pantalla contra el teléfono de U1 y el riesgo reputacional de U4.** Si U1 no lee el deadline a brazo largo, o U4 no podría defender lo que ve ante un estudiante, la pantalla no está terminada.
11. **En demos, mostrar los datos, no las features.** Mostrar un item con `No especificado` y una verificación antigua: eso es lo que gana confianza con esta audiencia. Nunca un registro sintético sin su etiqueta demo.
12. **Cada componente nuevo se justifica con un fallo numerado o un JTBD de este documento.** Superficie injustificada → se elimina, no se difiere.

---

## 10. Decisiones de Fase 1 que rigen el resto del proyecto

| # | Decisión | Estado |
|---|---|---|
| D1 | MVP **search-first**; globo fuera de MVP, condicionado a los 4 criterios de §2.1 | Aprobada |
| D2 | Fuentes automatizables en MVP: **solo EACEA RSS**. Chevening solo curación manual hasta verificación legal | Aprobada |
| D3 | DAAD / universidades / Fulbright / studyineurope.eu: **no automatizar** | Aprobada |
| D4 | Motor de estado como **función pura**, 6 estados, no-CLOSED-on-failure, no-OPEN-from-fecha | Aprobada |
| D5 | Shortlist anónima sin login en MVP | Aprobada |
| D6 | Página de metodología pública obligatoria | Aprobada |
| D7 | Demo siempre etiquetado, nunca mezclado con real | Aprobada |
| D8 | Datos + enlace, no prosa de terceros copiada | Aprobada |
| D9 | Cero monetización, cero lenguaje "garantizado", cero afiliación | Aprobada |
| D10 | Gate: no implementar (Fase 9) hasta aprobar Fases 1–8 | Aprobada |
| D11 | **Infraestructura Opción A** (Vercel + QStash + Route Handlers firmados), sin egress de red; aceptada con las 6 mitigaciones obligatorias de `security-baseline §6.3` y tests negativos SSRF que bloquean el build. La frontera de fetch queda encapsulada (`SafeHttpClient`) para migrar a Opción C sin reescribir adapters | Aprobada |
| D12 | **Scope de publicación honesto**: ~**150–250 registros** verificables publicados. 300 queda como techo aspiracional, no como compromiso. El gate §3.2 no se baja para alcanzar la cifra | Aprobada |
| D13 | **UI en ES + EN** desde el MVP | Aprobada |
| D14 | **Curación manual 2–4 h/semana durante ~3 meses**. El ritmo real es un riesgo de AR-9 (cold start), no un supuesto: hay que medirlo en el primer mes | Aprobada |
| D15 | **Postgres: Supabase**, proyecto `zmseqixhtciqylprfrfh` (cierra Q-B). El proyecto ya está provisionado, por lo que la decisión queda registrada como hecho y no como preferencia. Ver §10.2 para las tres restricciones que impone | Aprobada |

### 10.2 D15 · Supabase: lo que la decisión impone

Elegir Supabase no es solo cambiar una URL: fija tres cosas que el código y la
operación tienen que respetar.

| Restricción | Por qué | Consecuencia en el repo |
|---|---|---|
| **Conexión por el pooler, no directa** | `db.<ref>.supabase.co` solo resuelve por IPv6. Falla en Vercel y en la mayoría de portátiles | `DATABASE_URL` usa el host `aws-0-<region>-pooler.supabase.com` |
| **Pooler en modo Session (5432), no Transaction (6543)** | El modo Transaction no admite estado de sesión ni `SET`. Las migraciones y el `pg_try_advisory_xact_lock` del sync lo necesitan | El lock de sync depende de advisory locks: incompatible con Transaction mode |
| **La publishable key no se usa** | Es para PostgREST desde el navegador con RLS. El servidor lee por Postgres directo. Además D5 decide que no hay login, así que no hay cliente de Supabase | Ni `NEXT_PUBLIC_*` ni `@supabase/supabase-js` |

**Lo que Supabase NO cubre aquí:** la publishable key no sustituye a
`JOB_HMAC_SECRET`. Sigue siendo obligatorio y sigue sin valor por defecto: sin
él, `/api/jobs/sync` devuelve 503 en vez de degradar a un modo abierto.

**Pendiente de verificar en el primer uso real:** que PITR esté activo y que el
proyecto resida en la región de la UE, condición de `security-baseline §6.4`.
Ambas se comprueban en el panel, no en el repositorio.

### 10.1 Nota de nombres: `D#` vs `Q-#`

Este documento usa el prefijo **`D#`** para decisiones ya **aprobadas**. Los documentos de fases posteriores usan el prefijo **`Q-#`** (= *question*) para decisiones **pendientes**. No son el mismo espacio de nombres: no reabrir una `D#` como si fuera una `Q-#`.

| Prefijo | Significado | Dónde vive | Puede reabrirse |
|---|---|---|---|
| `D#` | Decisión aprobada por el propietario | Este §10 | No, salvo cambio explícito del propietario |
| `Q-#` | Pregunta abierta esperando decisión | `architecture.md` §12, `technical-blueprint.md` §12, `value-impact-refinement.md` §12 | Sí |

**Estado de las `Q-#` tras las decisiones del propietario:**

| Q | Asunto | Estado |
|---|---|---|
| **Q-A** | Opción A o C de infraestructura | **Cerrada por D11** → Opción A |
| **Q-B** | Neon o Supabase | **Cerrada** → **Supabase**, proyecto `zmseqixhtciqylprfrfh` (elegido por el propietario, 2026-10-01). Ver D15 |
| **Q-C** | ¿Publicar con 1 adapter + N curados o esperar 3 automatizados? | **Cerrada** → publicar con 1 adapter + N curados (§5.2, coherente con D2/D3) |
| **Q-D** | PostHog self-hosted vs cloud EU | **Abierta**, con la restricción ya fijada: sin PII, sin queries de búsqueda crudas |
| **Q-E** | Frecuencia de re-verificación manual | **Parcialmente cerrada por D14**; la cadencia fina por volatilidad sigue abierta (pasa a P0–P3) |

**Consecuencia para la ejecución:** las dos `Q-#` abiertas (Q-B, Q-D) son decisiones de **despliegue**, no de diseño. No bloquean Fases 7–8 y deben cerrarse antes de provisionar producción en Fase 9.

---

## 11. Consecuencias para las fases siguientes

### Para Fase 3 (Architecture)
- Los 8 bloqueantes de seguridad (§6.3) son **restricciones de diseño**, no tareas de pos-lanzamiento. La allowlist y el pin de IP se diseñan ahora.
- El worker de sync necesita un entorno sin ruta a metadatos: decide infraestructura en Fase 3/7.
- Serialización explícita en la capa API (allowlist de campos), no "devolver el objeto".

### Para Fase 4 (Data Strategy)
- `resolveStatus()` como función pura es el corazón del modelo.
- Los campos de provenance (`source_licence`, `discovered_via`, `legal_clearance`, `deadline_basis`) son parte del schema, no opcionales.
- Índice GIN sobre `tsvector` para FTS desde el inicio.

### Para Fase 6 (Visual Direction)
- Las reglas §9 dan la identidad: metadata de confianza primero, cero geografía decorativa, un solo acento semántico, tipografía y layout sobre efectos. Esto **contradice** la paleta con glow/neón del plan inicial — hay que revisarlo en Fase 6.

### Para Fase 7 (Technical Blueprint)
- Stack a confirmar, pero con cambio relevante: el ego de 3D (R3F/drei) **deja de ser dependencia de MVP**. Se mantiene en el stack solo si las condiciones de §2.1 se alcanzan.
- Cron simple por fuente; sin motor genérico de jobs en MVP.

---

## 12. Preguntas abiertas

| # | Pregunta | Por qué importa | Quién resuelve |
|---|---|---|---|
| Q1 | ¿Es alcanzable ≥300 registros reales por curación manual dentro de un plazo razonable? | Si no, el gate de §3.2 no se cumple y el MVP no se puede demostrar | Fase 4/5 |
| Q2 | ¿Se puede verificar la licencia pública de Chevening (ToS/OGL)? | Determina si el segundo adapter se automatiza o permanece manual | Legal, antes de Fase 9 |
| Q3 | ¿Cuánto puede cubrir el corpus de EACEA RSS? Si es pequeño, quizá la curación manual debe ser el canal principal | Define la arquitectura de datos real | Fase 4 (spike técnico) |
| Q4 | ¿Qué volumen de registros y qué ciclicidad se requiere para que el countdown sea fiable por zona horaria? | Afecta el modelo de `deadline_basis` | Fase 4 |
| Q5 | ¿Se implementa un endpoint de búsqueda semántica (embeddings) o FTS puro basta? | Complejidad vs valor | Fase 5/7 |

---

*Fin de Fase 1. Siguiente: Fase 2 (refinamiento de valor) + Fase 3 (Arquitectura).*
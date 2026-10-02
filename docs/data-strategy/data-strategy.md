# FASE 4 — Data Strategy

> **Proyecto:** plataforma de becas internacionales verificables.
> **Entradas leídas íntegro:** `docs/discovery/discovery.md`, `docs/architecture/architecture.md`, `docs/discovery/legal-matrix.md`, `docs/discovery/value-impact.md`, `docs/discovery/security-baseline.md`.
> **Fuentes de verdad, por orden de autoridad:** `architecture.md` §7 (ERD + restricciones) → `discovery.md` §4/§5/§7 → `legal-matrix.md` §8 → `security-baseline.md` §6.
> **Qué NO hace este documento:** no re-litiga D1–D10, ni ADR-001..004, ni el estado `UNKNOWN`/`CLOSED`. No introduce columnas que contradigan el ERD de `architecture.md` §7.1. No escribe código de aplicación: los bloques SQL/TS son **pseudo-código de diseño** para fijar semántica exacta, no migraciones ni implementación.
> **Convención de marcado:** 🔒 = restricción que la base de datos impone (no esquivable desde la aplicación) · ⚠️ = hallazgo que requiere corrección · `ADD-xx` = extensión propuesta al ERD · `DS-xx` = decisión de Fase 4.

---

## 0. Resumen ejecutivo y decisiones de Fase 4

### 0.1 Tesis del modelo

La arquitectura de Fase 3 dio forma a las entidades. Esta fase responde a una sola pregunta: **¿qué necesita la base de datos para que ninguna afirmación del producto pueda ser falsa por accidente?**

La respuesta son cinco invariantes, y todo lo que sigue es su consecuencia:

| # | Invariante | Donde vive |
|---|---|---|
| I1 | Nada se publica sin `source_url` + `last_verified_at` + `source_licence` | 🔒 `CHECK publish_requires_provenance` |
| I2 | Un fallo de verificación **jamás** produce `CLOSED` | `resolveStatus()` función pura + 🔒 `CHECK unknown_requires_reason` + suite de tests |
| I3 | Un campo published siempre se puede atribuir a una fuente, un path y un run | 🔒 `field_provenance` UNIQUE por (registro, campo) |
| I4 | Un cambio de estado siempre deja rastro de quién, cuándo, por qué | `status_history` + `audit_trail` append-only (🔒 trigger) |
| I5 | Un countdown nunca puede ser inventado | 🔒 `CHECK deadline_at ⇒ deadline_basis ≠ unknown ∧ precision ≠ UNKNOWN` |

### 0.2 Decisiones tomadas en Fase 4

| ID | Decisión | Motivo | Estado |
|---|---|---|---|
| **DS-01** | El corpus **no** se parte en tablas "curados" y "automatizados" | La distinción es **datos** (`sources.kind`, `discovered_via`, `curator`), no esquema. Partir duplica los `CHECK` y abre la puerta a relajar el gate de publicación para una tabla → agujero de R3. | **Adoptada** |
| **DS-02** | Los fallos de verificación se clasifican en **UNKNOWN_DEFINITIVE** y **UNKNOWN_AMBIGUOUS** por confianza, no por estado | `UNKNOWN` sigue siendo un solo estado (no re-litiga ADR-002). Lo que cambia es `status_confidence`, que el usuario nunca ve como categoría. | **Adoptada** |
| **DS-03** | Un deadline `inferred_from_cycle` **nunca** produce `OPEN` ni `EXPIRED`; solo `UPCOMING` o `UNKNOWN`+`needs_review` | Endurecimiento de §4.4 ("nunca calcular días restantes desde un cutoff asumido") aplicado también al estado. Las inferencias solo pueden producir estados que no instruyen a actuar. | **Requiere firma Fase 5** (es más estricto que el texto literal) |
| **DS-04** | `deadline_precision` es campo obligatorio; sin él no hay countdown | Es **el** mecanismo que evita el error de ±1 día (R6). Sin él no se distingue "6 oct 11:00 UTC" de "6 oct". | **Adoptada** |
| **DS-05** | Con `precision = DATE` **sí** hay countdown, en **días naturales**, con la convención de fin de día **declarada y visible** | R6 prohíbe el countdown desde un cutoff **asumido e invisible**. Con `deadline_precision = DATE` + `deadline_tz` + el verbatim, el cutoff es una **regla nuestra que se muestra al usuario**, no un supuesto silencioso. Además, "días restantes" es variable de decisión obligatoria en la tarjeta de resultado (`discovery §9.4`), así que suprimirlo dejaría sin su variable principal a la mayoría del corpus. §4.4 fija el copy exacto | **Requiere firma Fase 6** (afecta UI) |
| **DS-06** | El read-model de búsqueda es una **vista + CTE parametrizado**, no una vista materializada | 300 filas: una MV no compra nada y añade invalidación. Se escala solo si hay evidencia (SLO de latencia + `pg_stat_statements`). | **Adoptada** |
| **DS-07** | `needs_reverification` es **derivado** (vista), no una columna almacenada | Una columna de caducidad es un flag que se desincroniza del `last_verified_at` que lo justifica. Se deriva en la cola P0–P3. | **Adoptada** |
| **DS-08** | `possible_duplicate_of` es **señal**, `duplicate_group_id` es **hecho** | Coste asimétrico: un grupo equivoco despublica una beca real; una señal ruidosa cuesta un minuto humano. Separarlos permite automatizar la señal sin automatizar el daño. | **Adoptada** |
| **DS-09** | Sin fuzzy matching en MVP | Asimetría de coste ~1000×, volumen bajo y un fallo demostrable de trigram en títulos Erasmus. Re-evaluable solo con evidencia (M6 > 2% sostenido + carga de curación alta). | **Adoptada** |

### 0.3 Cuatro hallazgos que bloquean la migración

⚠️ El SQL de `architecture.md` §7.2 **no se puede ejecutar tal cual** (H1–H3). Un cuarto hallazgo (H4) es un `CHECK` *correcto* que destruye datos: también bloquea la migración.

| # | Hallazgo | Consecuencia si no se corrige |
|---|---|---|
| **H1** | `CREATE INDEX … ON scholarships (source_id, …)` usa una columna **que no existe** en el ERD, pero sí aparece en la relación `SOURCES ‖--o{ SCHOLARSHIPS` y en M4 | La migración falla. ADD-01 lo resuelve |
| **H2** | El `CHECK deadline_sane` usa `now()`, que es **STABLE, no IMMUTABLE** → Postgres lo rechaza | La migración falla. §2.3 da la corrección |
| **H3** | `CHECK unknown_requires_reason` y `publish_requires_provenance` tienen un **agujero con NULL** (en SQL, un `CHECK` que evalúa a `NULL` **pasa**) | Un registro con `internal_status = NULL` o `is_published = NULL` evita I1 e I2. §2.1/§2.2 dan la corrección |
| **H4** | El `CHECK` "UNKNOWN no tiene deadline" (forma natural de hacer estructural el I5 de §4.4) **exige `NULL` en el deadline** de todo registro `UNKNOWN` | La migración pasa y **el bug aparece en producción**: cada fallo de red borra el deadline verificado. §2.2 explica por qué se sustituye por `unknown_keeps_evidence` |

---

## 1. Modelo de datos completo

### 1.1 Convenciones

- **Tipos**: `uuid` para toda clave primaria y FK (evita enumeración y colisiones entre entornos, `security §9`); `text`/`varchar(n)` acotado; `timestamptz` para todo instante (**nunca** `timestamp` sin zona: R6); `date` solo para `opening_date`; `text[]` para conjuntos multivalor; `jsonb` únicamente para bloques de descriptor, nunca para campos de negocio consultables.
- **Null vs. valor centinela**: `null` significa **"no publicado por la fuente"** y se renderiza como `No especificado` (`discovery §9.4`, ADR-004a). Los centinelas `'UNKNOWN'` de los enums existen porque esos campos son **obligatorios** en el esquema y `null` colapsaría "no publicado" con "no clasificado". Nunca se inventa valor para rellenar un centinela.
- **Booleanos de control** (`is_published`, `needs_review`, `is_demo`, `kill_switch`) son `NOT NULL DEFAULT <valor>` para que ningún `CHECK` pueda ser evadido con `NULL`.
- **Inmutabilidad**: `is_demo` es inmutable tras la creación (`architecture §12`); `status_history`, `audit_trail`, `record_versions` y `fetch_log` son append-only (trigger, §2.7).

### 1.2 `sources` — health de fuentes

| Columna | Tipo | Null | Default | Restricción | Propósito |
|---|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK | Identificador interno |
| `key` | varchar(64) | NO | — | **UNIQUE** | Identidad estable: `eacea-emjmd-rss`, `chevening-manual-seed` |
| `name` | varchar(200) | NO | — | — | Nombre legible (se muestra en la UI y en la atribución) |
| `kind` | varchar(20) | NO | — | CHECK enum `feed \| manual \| api \| curator-submission` | Canal de adquisición. **`manual` = curación humana** (DS-01) |
| `licence` | varchar(64) | NO | `'NONE'` | CHECK enum `CC BY 4.0 \| OGL v3.0 \| public-domain \| written-permission \| manual-curation \| NONE` | Licencia declarada (legal §9.A.3) |
| `legal_clearance` | jsonb | NO | `'{}'` | CHECK bloque obligatorio para `is_active = true` | **B6**: sin clearance la fuente no se monta. Campos: `termsUrl`, `termsRetrievedAt`, `verbatimClause`, `permissionArtefact`, `robotsArchivedHash`, `prohibitedUseCleared`, `trademarkCleared`, `reviewer`, `reviewedAt` |
| `kill_switch` | boolean | NO | `false` | — | Congela la fuente en minutos sin deploy (R3, legal §9.27) |
| `owner` | varchar(128) | NO | — | — | **B7**: responsable nombrado |
| `is_active` | boolean | NO | `true` | — | Entra o no en la cola de sincronización |
| `base_domain` | varchar(255) | YES | — | — | Host de las URLs que esta fuente verifica. Alimenta la denylist de agregadores (legal §8.5) |
| `freshness_window_days` | int | NO | `14` | CHECK `> 0` | **Cadencia de re-verificación** por fuente (`legal-matrix §11`: anual → 30, rolling → 30, embajada → 14). Base de M4 y de la cola P0–P3 |
| `created_at` / `updated_at` | timestamptz | NO | `now()` | — | Auditoría |

**Por qué `freshness_window_days` vive en `sources` y no en `scholarships`:** la cadencia depende del *tipo de convocatoria* (ciclo fijo, rolling, por país/ciclo), que es una propiedad del programa y por tanto de su fuente, no del registro individual. Añadirlo por registro multiplicaría un dato que ya existe en la tabla de cadencia de `legal-matrix §11` y crearía 300 valores que nadie mantiene. **Limitación documentada:** dos programas de la misma fuente con volatilidades distintas comparten ventana; se acepta en MVP y se revisa si la métrica de frescura de §7.1 Q4 revela sesgo por fuente.

**Por qué `base_domain` y no nada:** `legal-matrix §8.5` exige rechazar cualquier registro cuyo `source_url` apunte a un agregador, y `architecture §4.4` exige "quarentena, no borrado". Sin el dominio de la fuente, esa comprobación no se puede hacer en SQL. También sirve para el requisito §3.2 de "≥15 dominios fuente distintos".

### 1.3 `countries`

| Columna | Tipo | Null | Default | Restricción | Propósito |
|---|---|---|---|---|---|
| `iso2` | char(2) | NO | — | PK | ISO 3166-1 alfa-2 |
| `iso3` | char(3) | NO | — | **UNIQUE** | ISO 3166-1 alfa-3 |
| `name_es` | varchar(120) | NO | — | — | Nombre español |
| `name_en` | varchar(120) | NO | — | — | Nombre inglés |
| `region` | varchar(64) | YES | — | — | `Europe`, `Africa`, `America`, `Asia`, `Oceania` |

Sin ISO 3166-1alpha-2 en el nombre: el lookup es por código, nunca fuzzy. El nombre se resuelve en render. Esto es una desnormalización de presentación controlada: la búsqueda por nombre de país se resuelve en el cliente leyendo `countries` (250 filas, cabe en memoria) y buscando por código.

### 1.4 `scholarships` — entidad principal

#### 1.4.a Identidad y clasificación

| Columna | Tipo | Null | Default | Restricción | Propósito |
|---|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK | ID interno. Nunca se expone (M3 de seguridad: no enumerar) |
| `slug` | varchar(64) | NO | — | **UNIQUE** · CK `~ '^[a-z0-9][a-z0-9-]{4,63}$'` | Slug público, en la URL. El ERD lo define "público aleatorio": **no se deriva del título** para no permitir enumerar el catálogo (`security §9`). Formato único en §1.4.a y §2.5 |
| `source_id` | uuid | YES | — | **ADD-01** · FK → `sources(id)` `ON UPDATE CASCADE ON DELETE SET NULL` | Fuente que descubrió/verificó el registro. FK implícita por la relación del ERD `SOURCES \|\|--o{ SCHOLARSHIPS` y usada por el índice de frescura de §2.8 |
| `external_id` | varchar(200) | YES | — | **ADD-02** | ID del programa en la fuente. Es la **identidad fuerte** de dedupe (§5) |
| `official_url` | varchar(2048) | YES | — | CHECK `official_url IS NULL OR official_url ~ '^https?://'` | Página del programa en la entidad. **Distinta de `source_url`**: esta es a dónde va el usuario, `source_url` es de dónde obtuvimos el dato |
| `application_url` | varchar(2048) | YES | — | CHECK `application_url IS NULL OR application_url ~ '^https?://'` | Formulario de-postulación. Es el CTA. `null` → "Solicitudes: no indicadas por la fuente" |
| `title` | varchar(400) | NO | — | CK longitud saneada | Título oficial. Es T0: se renderiza como texto, nunca como HTML |
| `provider` | varchar(200) | YES | — | — | Entidad financiadora. `null` → "No especificado" |
| `university` | varchar(200) | YES | — | — | Universidad o consorcio |
| `country_iso2` | char(2) | YES | — | FK → `countries(iso2)` `ON UPDATE CASCADE` | Destino principal |
| `destination_countries` | text[] | NO | `'{}'` | **ADD-04** | Destinos adicionales. Un EMJM es multi-país; forzar uno solo pierde información real |
| `level` | varchar(20) | NO | `'UNKNOWN'` | CHECK enum `UNDERGRAD \| MASTER \| PHD \| RESEARCH \| SHORT_TERM \| UNKNOWN` | Nivel de estudios |
| `fields` | text[] | NO | `'{}'` | — | Áreas. Sin tabla pivote: se busca con array containment, indexable vía GIN si hace falta |
| `modality` | varchar(20) | NO | `'UNKNOWN'` | CHECK enum `ONLINE \| IN_PERSON \| HYBRID \| UNKNOWN` | Modalidad |

#### 1.4.b Financiación

| Columna | Tipo | Null | Default | Restricción | Propósito |
|---|---|---|---|---|---|
| `funding_type` | varchar(20) | NO | `'UNKNOWN'` | CHECK enum `FULL \| PARTIAL \| TUITION \| STIPEND \| UNKNOWN` | Tipo de financiación |
| `amount` | numeric(12,2) | YES | — | **ADD-06** · CHECK `amount IS NULL OR amount > 0` | Monto. `null` = "No especificado" (ADR-004a). Sin importe inventado |
| `currency` | char(3) | YES | — | — | Moneda ISO 4217. **No se normaliza a USD**: la conversión sería un dato no verificado |
| `coverage` | text[] | NO | `'{}'` | — | Cobertura (viaje, seguro, alojamiento) |
| `duration_months` | smallint | YES | — | **ADD-08** | Duración. En el feed EACEA como `ECTS Duration` |
| `ects` | smallint | YES | — | **ADD-08** | ECTS. Dato de catálogo oficial, no una estimación nuestra |

#### 1.4.c Procedencia y licencia (obligatoria por legal)

| Columna | Tipo | Null | Default | Restricción | Propósito |
|---|---|---|---|---|---|
| `source_url` | varchar(2048) | YES | — | **🔒 I1** · CHECK `source_url IS NULL OR source_url ~ '^https?://'` | ★ Página oficial del programa. **Nunca** un agregador. Obligatoria para publicar |
| `source_name` | varchar(200) | NO | — | — | Quién dice que es cierto. Se renderiza como "Fuente: X" |
| `source_licence` | varchar(64) | YES | — | **🔒 I1** · CHECK enum | Sin licencia no hay atribución posible → no se publica (legal §8.3) |
| `discovered_via` | varchar(40) | NO | `'manual-curation'` | CHECK enum `feed \| sitemap \| manual-curation \| curator-submission` | Cómo lo encontramos. **Campo separado de `source_url`**: son preguntas distintas (legal §8.2, ADR-004c) |
| `legal_clearance` | varchar(200) | YES | — | — | Ref. al clearance de la fuente. **Nunca público** (REVOKE, §2.10) |
| `curator` | varchar(128) | YES | — | — | Persona responsable. `null` en registros de feed |
| `curated_at` | timestamptz | YES | — | — | Cuándo se revisó a mano |
| `cycle_label` | varchar(40) | YES | — | **ADD-07** | Etiqueta de ciclo (`2026-2027`, `Call 2027`). **El feed EACEA mezcla colecciones `Legacy` con las actuales**; esta columna es la única forma de no tragar programas vencidos |

#### 1.4.d Estado y fechas

| Columna | Tipo | Null | Default | Restricción | Propósito |
|---|---|---|---|---|---|
| `source_status` | varchar(20) | YES | — | CHECK `source_status IN ('OPEN','CLOSED','UPCOMING','PAUSED')` | Lo que **dice** la fuente, verbatim del campo allowlisted. `null` si no lo dice. **Nunca se deriva** |
| `internal_status` | varchar(20) | NO | `'UNKNOWN'` | **🔒 NOT NULL** · CHECK enum de 6 valores | ★ Lo que **mostramos**. Siempre derivado de `resolveStatus()` |
| `status_confidence` | varchar(10) | NO | `'LOW'` | CHECK `HIGH \| MEDIUM \| LOW` | Confianza. `UNKNOWN_DEFINITIVE` → `HIGH`; ambiguo → `MEDIUM`/`LOW` (DS-02) |
| `status_reason` | varchar(200) | YES | — | **🔒 I2** `unknown_requires_reason` | Motivo legible. Obligatorio si `internal_status = 'UNKNOWN'` |
| `last_known_status` | varchar(20) | YES | — | CHECK enum de 6 valores | Estado con evidencia. Se preserva siempre que la nueva resolución no tenga evidencia (ADR-002e) |
| `last_known_status_at` | timestamptz | YES | — | — | Cuándo se observó ese estado. Alimenta "Última verificación: hace N días" |
| `opening_date` | date | YES | — | — | Fecha de apertura. `date` a propósito: sin hora declarada, no inventamos una |
| `deadline_at` | timestamptz | YES | — | **🔒 I5** + `deadline_sane` | Instante límite. Es el valor que cuenta; la `date` es lo que se muestra |
| `deadline_basis` | varchar(32) | NO | `'unknown'` | **🔒 I5** · CHECK enum `publisher_stated \| inferred_from_cycle \| unknown` | **Sin base conocida no hay countdown.** El default es la posición honesta: no sabemos |
| `deadline_precision` | varchar(20) | NO | `'UNKNOWN'` | **ADD-03** · CHECK `MINUTE \| HOUR \| DATE \| UNKNOWN` | **La clave de R6**: distingue "cierra 6 oct 11:00" de "cierra 6 oct". Sin esto no se puede evitar el error de ±1 día |
| `deadline_tz` | varchar(64) | YES | — | **🔒 I5** + FK → `timezones(name)` | Zona IANA declarada por la fuente. FK a catálogo: impide `CET`/`PST` ambiguos |
| `deadline_raw_text` | text | YES | — | **🔒 I5** | Verbatim del editor. **Se renderiza siempre junto al countdown** (discovery §4.4) |
| `deadline_date_order` | varchar(8) | YES | — | **ADD-05** · CHECK `DMY \| MDY \| ISO \| NULL` | Orden de lectura de fechas numéricas. `15/10/2026` es 15-oct en Europa y 15-ene en EEUU |
| `last_verified_at` | timestamptz | YES | — | **🔒 I1** | ★ Cuándo lo verificamos por última vez |
| `source_last_updated_at` | timestamptz | YES | — | — | `pubDate` del feed. **No sustituye a `last_verified_at`**: el feed no sabe si su contenido es correcto |
| `first_seen_at` | timestamptz | NO | `now()` | — | Primera vez visto. Nunca se sobrescribe |
| `last_seen_at` | timestamptz | NO | `now()` | — | Última vez visto. Su envejecimiento es la señal AR-1/R10 |

#### 1.4.e Control, demo, duplicados

| Columna | Tipo | Null | Default | Restricción | Propósito |
|---|---|---|---|---|---|
| `is_demo` | boolean | NO | `false` | **🔒 inmutable** · **🔒 `is_demo ⇒ ¬is_published`** | `architecture §12`: un demo nunca se publica ni se convierte en real |
| `is_published` | boolean | NO | `false` | **🔒 NOT NULL** · `publish_requires_provenance` | Gate de publicación |
| `needs_review` | boolean | NO | `false` | — | Cola de revisión. **Nunca público** |
| `needs_review_reason` | varchar(200) | YES | — | **ADD-09** | Por qué requiere revisión. Sin él, `needs_review` es un bool que nadie puede priorizar |
| `possible_duplicate_of` | uuid | YES | — | **ADD-10** · FK → `scholarships(id)` `ON DELETE SET NULL` | **Señal**, no hecho (DS-08). No despublica nada; crea tarea de curación |
| `duplicate_group_id` | uuid | YES | — | FK → `duplicate_groups(id)` | Hecho confirmado. `NULL` = no duplicado |
| `notes_internal` | text | NO | `''` | **REVOKE** | **Nunca público.** Contiene razonamiento del curador, incluidos lo dudoso |
| `deleted_at` | timestamptz | YES | — | — | Soft delete. Nunca hard delete (security §6.1) |
| `delete_reason` | varchar(200) | YES | — | CHECK `deleted_at IS NULL OR delete_reason IS NOT NULL` · **REVOKE** | Sin razón no hay borrado. Nunca público |
| `content_hash` | varchar(128) | YES | — | CHECK `=~ '^[0-9a-f]{64}$'` | Hash del subconjunto de campos que gobierna el contenido. Detecta "cambió algo" sin diff |
| `version` | int | NO | `1` | CHECK `>= 1` | Versión. `UPDATE … WHERE version = :v` es la condición de concurrencia (§6.4) |
| `search_vector` | tsvector | NO | GENERATED | **ADD-11** | tsvector materializado, multilingüe ponderado. Ver §2.9 |

#### 1.4.f El ERD de §7.1 contra esta tabla — diferencias explicadas

| En §7.1 | Aquí | Por qué |
|---|---|---|
| `country_iso2` como único destino | + `destination_countries` (ADD-04) | `NormalizedScholarship.destinationCountries` (architecture §8) es un array. Un EMJM tiene 2–6 países; forzar uno solo pierde datos reales del catálogo oficial |
| `duplicate_group_id` sin tabla de grupos | + `duplicate_groups` | `one_canonical_per_group` (architecture §7.2) necesita una FK válida |
| (sin columna) | + `source_id` (ADD-01) | La relación `SOURCES ‖--o{ SCHOLARSHIPS` del propio §7.1 y su índice de frescura lo requieren |
| (sin columna) | + `external_id` (ADD-02) | `NormalizedScholarship.externalId` es la identidad fuerte de dedupe |

### 1.5 `duplicate_groups` — **ADD-12**

| Columna | Tipo | Null | Default | Propósito |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `reason` | varchar(64) | NO | — | `exact_url \| exact_external_id \| curator_confirmed` |
| `created_by` | varchar(128) | NO | — | `curator` o `system` |
| `created_at` | timestamptz | NO | `now()` | — |

`one_canonical_per_group` (`architecture §7.2`) indexa `duplicate_members(duplicate_group_id) WHERE is_canonical`. Sin esta tabla, ese índice no tiene FK sobre la que ser válido.

### 1.6 `duplicate_members`

| Columna | Tipo | Null | Default | Restricción | Propósito |
|---|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK | — |
| `duplicate_group_id` | uuid | NO | — | FK → `duplicate_groups(id)` `ON DELETE CASCADE` | — |
| `scholarship_id` | uuid | NO | — | FK → `scholarships(id)` `ON DELETE CASCADE` · **UNIQUE** | Un registro en **un** grupo como máximo |
| `is_canonical` | boolean | NO | `false` | **🔒 `one_canonical_per_group`** | Exactamente un canónico por grupo |

**Por qué `UNIQUE(scholarship_id)`:** un registro en dos grupos es una contradicción que ningún `CHECK` captura y que rompe el cálculo de M6. Es la misma clase de bug que H3 (§1.4): NULL/duplicado que pasa inadvertido.

### 1.7 `field_provenance` — trazabilidad por campo

| Columna | Tipo | Null | Default | Restricción | Propósito |
|---|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK | — |
| `scholarship_id` | uuid | NO | — | FK → `scholarships(id)` `ON DELETE CASCADE` | — |
| `field_name` | varchar(64) | NO | — | **UNIQUE con `scholarship_id`** · CHECK contra lista blanca (§6.2) | Campo de negocio, no de sistema |
| `source_id` | uuid | YES | — | FK → `sources(id)` `ON DELETE SET NULL` | Quién proporcionó el valor |
| `source_url` | varchar(2048) | YES | — | — | **Página concreta** de la que salió el valor. Distingue "la fuente" de "esta URL" |
| `source_field_path` | varchar(300) | YES | — | — | JSONPath en el feed. `null` para curación manual: un humano no tiene XPath, tiene una URL |
| `fetched_at` | timestamptz | NO | — | — | Instante de la lectura |
| `run_id` | uuid | YES | — | FK → `sync_runs(id)` `ON DELETE SET NULL` | Run que lo leyó |
| `method` | varchar(16) | NO | `'auto'` | CHECK `auto \| curator` | `auto` = machine; `curator` = humano leyó la página |
| `curator` | varchar(128) | YES | — | CHECK `method = 'auto' OR curator IS NOT NULL` | Quién, si fue humano |

**🔒 I3 — `UNIQUE(scholarship_id, field_name)` con `UPSERT` en la misma transacción que escribe el campo.** Solo hay una fila de procedencia por campo: la **vigente**. El histórico de cambios vive en `audit_trail` (§6.3). Duplicar el histórico aquí multiplicaría escrituras sin ganar nada.

**Por qué `source_url` y no solo `source_id`:** el feed EACEA entrega 25 ítems que apuntan a URLs de consorcios distintos, todos bajo la misma `source_id`. Saber *qué página* produjo el deadline es lo que hace el dato auditable ante un usuario que disputa el valor.

### 1.8 `record_versions` — versionado de contenido

| Columna | Tipo | Null | Default | Restricción | Propósito |
|---|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK | — |
| `scholarship_id` | uuid | NO | — | FK → `scholarships(id)` `ON DELETE CASCADE` | — |
| `version` | int | NO | — | **UNIQUE con `scholarship_id`** | — |
| `content_hash` | varchar(128) | NO | — | — | Hash de este snapshot |
| `snapshot` | jsonb | NO | — | — | Estado completo en ese momento |
| `changed_fields` | text[] | NO | `'{}'` | — | Qué cambió respecto a `version - 1`. Es el diff legible |
| `created_at` | timestamptz | NO | `now()` | — | — |

Se escribe **solo cuando `content_hash` cambia**. A 300–5000 registros, el volumen es de decenas de miles de filas: se conserva todo (permite "el deadline se movió de X a Y" sin límite de tiempo), pero el snapshot se poda a los 20 campos de negocio, nunca el registro completo.

### 1.9 `status_history` — historial de estados (append-only)

| Columna | Tipo | Null | Default | Propósito |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `scholarship_id` | uuid | NO | — | FK → `scholarships(id)` |
| `from_status` | varchar(20) | YES | — | Estado previo. `NULL` en la primera fila |
| `to_status` | varchar(20) | NO | — | Estado nuevo |
| `reason` | varchar(200) | NO | — | Motivo. **Un cambio de estado sin motivo no se escribe** |
| `confidence` | varchar(10) | NO | — | `HIGH \| MEDIUM \| LOW` |
| `source_id` | uuid | YES | — | FK → `sources(id)` |
| `run_id` | uuid | YES | — | FK → `sync_runs(id)` |
| `actor` | varchar(20) | NO | `'system'` | CHECK `system \| curator \| admin` |
| `created_at` | timestamptz | NO | `now()` | — |

🔒 **Append-only por trigger** (§2.7). Nunca se actualiza ni se borra. Corregir un error de estado es **insertar una fila nueva** que lo revierte, nunca editar la anterior.

### 1.10 `audit_trail` — append-only campo a campo

| Columna | Tipo | Null | Default | Propósito |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `scholarship_id` | uuid | NO | — | FK → `scholarships(id)` |
| `field` | varchar(64) | NO | — | Campo modificado |
| `old_value` | text | YES | — | Valor anterior. `NULL` = no existía |
| `new_value` | text | YES | — | Valor nuevo. `NULL` = se borró |
| `source_id` | uuid | YES | — | FK → `sources(id)` |
| `run_id` | uuid | YES | — | FK → `sync_runs(id)` |
| `actor` | varchar(20) | NO | `'system'` | `system \| curator \| admin` |
| `created_at` | timestamptz | NO | `now()` | — |

### 1.11 `sync_runs` — salud de fuente

| Columna | Tipo | Null | Default | Propósito |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `source_id` | uuid | NO | — | FK → `sources(id)` `ON DELETE CASCADE` |
| `adapter_version` | varchar(40) | NO | — | Contrato del parser versionado (SPOF de architecture §3) |
| `started_at` | timestamptz | NO | `now()` | — |
| `finished_at` | timestamptz | YES | — | — |
| `outcome` | varchar(20) | NO | — | CHECK `success \| partial \| failed \| skipped_locked` |
| `http_status` | int | YES | — | — |
| `parse_ok` | boolean | NO | `false` | **M7** |
| `status_extracted` | boolean | NO | `false` | **M7**: ¿se obtuvo un estado recognized? |
| `records_seen` | int | NO | `0` | **M7** |
| `records_changed` | int | NO | `0` | — |
| `needs_review_count` | int | NO | `0` | Señal AR-7 |
| `bytes` | int | NO | `0` | — |
| `error_code` | varchar(64) | YES | — | **Nunca payload crudo** (B7) |
| `error_class` | varchar(64) | YES | — | **Nunca público** |

`outcome = 'skipped_locked'` existe porque `pg_try_advisory_xact_lock` por `source_id` (AR-6) hace que el segundo run se aborte limpio, y eso es un evento observable, no un silencio.

### 1.12 `fetch_log` — evidencia de fetch (append-only)

Columnas idénticas al ERD §7.1: `id`, `run_id`, `source_id`, `url`, `host`, `decision`, `reason`, `status_code`, `bytes`, `duration_ms`, `etag`, `resolved_ip`, `created_at`.

**Refinamiento de Fase 4 — `resolved_ip` pasa a ser `inet NOT NULL` para las filas `decision='fetch'`.** Es la evidencia auditable de que el pin de IP ocurrió (`architecture §11.3` mitigación 6). Permitir `NULL` en una fila de fetch la convierte en un log decorativo.

**Refinamiento de Fase 4 — `decision` admite `not_modified` y `blocked` como valores distintos**, y `reason` incorpora `deferred_budget` / `deferred_circuit` para que la consulta de freshness distinga "no lo intentamos" de "lo intentamos y falló" (§3.6).

### 1.13 `validation_violations` — **ADD-13**

Existe porque `needs_review` sin detalle no es accionable.

| Columna | Tipo | Null | Default | Propósito |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `scholarship_id` | uuid | NULL | — | NULL si la violación impide crear el registro |
| `run_id` | uuid | YES | — | FK → `sync_runs(id)` |
| `field_path` | varchar(200) | NO | — | Dónde |
| `code` | varchar(64) | NO | — | `DEADLINE_IN_PAST`, `ENUM_UNKNOWN`, `DEADLINE_AMBIGUOUS_DATE`, `AMOUNT_NEGATIVE`… |
| `severity` | varchar(10) | NO | — | CHECK `INFO \| WARN \| BLOCKING` |
| `raw_value_preserved` | jsonb | YES | — | Valor crudo. **Se conserva, no se pierde** (contrato `ValidationViolation`) |
| `previous_good_value` | jsonb | YES | — | El valor bueno previo. Nunca se pisa |
| `resolved_at` | timestamptz | YES | — | NULL = pendiente |
| `created_at` | timestamptz | NO | `now()` | — |

**Retención: 90 días** (`security §8`: los payloads crudos son el mayor almacén accidental de PII). Es la única tabla con caducidad aggressive.

### 1.14 `timezones` — **ADD-14**

Catálogo generado: `name text PK` (de `pg_timezone_names`), `is_area boolean` (¿es `Europe/Madrid` y no `CET`?).

**Por qué una tabla y no un `CHECK`:** un `CHECK` no puede consultar `pg_timezone_names` (serían inmutables). Con FK, `deadline_tz` solo puede contener un identificador IANA válido, y `is_area = true` impide que alguien escriba `CET` y obtenga un countdown desplazado una hora cada seis meses (DST). `UTC` y `Etc/UTC` se permiten explícitamente: el feed y Chevening los declaran.

### 1.15 `user_scholarships` y `shortlist_shares`

Shortlist anónima (D5, RF-5). Sin auth, sin PII.

`user_scholarships`: `id` uuid PK · **`token_hash` char(64) NOT NULL UNIQUE** · `scholarship_id` uuid NOT NULL FK → `scholarships(id)` `ON DELETE CASCADE` · `note` text NULL con `CHECK (char_length(note) <= 500)` · `created_at` timestamptz NOT NULL.

- **UNIQUE en `token_hash`**: es la frontera de ownership (security §5.4, IDOR). El scoping es `WHERE token_hash = :hash` derivado de la sesión, **nunca** un `user_id` del cliente.
- **`ON DELETE CASCADE` desde `scholarships`**: si un registro se elimina (nunca se hard-deletea, pero un borrado físico de una fila corrupta debe propagar), la shortlist no apunta a nada muerto.
- `token_hash` es SHA-256 del token. El token en claro solo existe en la URL compartida; nunca se almacena.

`shortlist_shares`: `share_slug` varchar(32) PK (aleatorio, ≥128 bits de entropía) · `token_hash` char(64) NOT NULL · `expires_at` timestamptz NOT NULL.

### 1.16 `search_events` — M2 sin PII

`id` uuid PK · `intent_key` varchar(120) NOT NULL con `CHECK (char_length(intent_key) <= 120)` · `locale` varchar(10) NOT NULL · `result_count` int NOT NULL con `CHECK (result_count >= 0)` · `created_at` timestamptz NOT NULL.

**Tensión resuelta (`architecture §7.3`):** `discovery §7 M2` pide query normalizada; `security §8` prohíbe free-text en eventos. Solución: `intent_key` es la query normalizada (lowercase, sin acentos, stopwords, truncada a 120) con **filtro de PII activo**; **PostHog recibe solo un hash de intención + `result_count`**. `search_events` no sale del servidor por `REVOKE`.

### 1.17 Vistas de lectura (no tablas)

| Vista | Para qué | Contenido |
|---|---|---|
| `v_scholarships_public` | **Única** vía de lectura pública (DS-06) | Solo los campos del allowlist de `architecture §10.6` + `is_demo = false` + `deleted_at IS NULL` |
| `v_records_needing_reverification` | Cola P0–P3 (DS-07) | `last_verified_at` más antiguo que `sources.freshness_window_days` |
| `v_source_health` | Página de metodología + alerta M7 (AR-5) | Por fuente: último run, último éxito, parse_ok 7d, freshness 14d, `needs_review` pendientes |
| `v_open_records` | Base de countdown, coropleta, M5 | `internal_status IN ('OPEN','UPCOMING')` ∧ publicados ∧ no demo ∧ `deadline_at` válido |
| `v_metrics_dashboard` | M3, M5, M6, M7 (§3.2, §7) | Un `SELECT` para la página de metodología, **excluyendo `is_demo` siempre** |

**Por qué vistas y no tablas materializadas:** cada una es derivable de la tabla base y puede quedar desincronizada. Una vista desincronizada es peor que una vista lenta: en un producto cuyo claim es la trazabilidad, un número de metodología que no cuadra con los datos es un incidente de confianza.

**La vista es también donde se hace cumplir el "UNKNOWN no muestra countdown" (H4).** No puede ser un `CHECK` sin destruir el dato, así que se resuelve como una expresión que devuelve `NULL`:

```sql
-- pseudo-SQL de diseño: v_scholarships_public
CREATE VIEW v_scholarships_public AS
SELECT
  -- Campos del allowlist de architecture §10.6 + los justificados en §2.10
  id, slug, title, provider, university, country_iso2, destination_countries,
  level, fields, modality, funding_type, amount, currency, coverage,
  duration_months, ects, official_url, application_url,
  source_url, source_name, source_licence,
  source_status, internal_status, status_confidence, status_reason,
  last_known_status, last_known_status_at, opening_date,
  deadline_at, deadline_basis, deadline_precision, deadline_tz, deadline_raw_text,
  last_verified_at, cycle_label, is_demo,

  -- Derivados de deadline. Los seis filtros de §4.2, en orden.
  -- CASE con WHEN: si CUALQUIER condición falla, el resultado es NULL (no 0).
  CASE
    WHEN internal_status NOT IN ('OPEN','UPCOMING')          THEN NULL
    WHEN deadline_at IS NULL                                  THEN NULL
    -- Solo publisher_stated. inferred_from_cycle es NUESTRO estimate: un
    -- countdown ahí sería precisión inventada (discovery §4.4 / R6).
    WHEN deadline_basis <> 'publisher_stated'                 THEN NULL
    WHEN deadline_precision = 'UNKNOWN'                       THEN NULL
    WHEN deadline_at <= now()                                 THEN NULL
    WHEN deleted_at IS NOT NULL                              THEN NULL
    -- MINUTE/HOUR: horas completas al instante absoluto
    WHEN deadline_precision IN ('MINUTE','HOUR')
      THEN deadline_at - now()
    -- DATE: días naturales hasta el fin del día del deadline EN deadline_tz
    WHEN deadline_precision = 'DATE'
      THEN ( (deadline_at AT TIME ZONE deadline_tz)::date
              - (now()  AT TIME ZONE deadline_tz)::date )::int
  END                                                        AS countdown_raw
  -- countdown_label (texto) y countdown_tone (urgencia) se calculan en capa de
  -- presentación con countdown_raw + deadline_tz + la zona del lector (§4.3).
FROM scholarships
WHERE is_demo = false          -- architecture §12: filtro estructural, no recordatorio
  AND deleted_at IS NULL;
```

**Las dos decisiones que hacen que esto sea correcto y no solo elegante:**

| Decisión | Por qué |
|---|---|
| `CASE WHEN`, no `COALESCE(...)` con `0` | Un countdown degradado a `0` es exactamente el bug de R6 ("0 días" con 30 minutos restantes). Aquí `0` **no existe** como valor de salida: o hay un intervalo, o `NULL` |
| `is_demo = false` en el `WHERE`, no en un `REVOKE` de columna | Cumple literalmente `architecture §12` ("toda consulta pública incluye `is_demo = false` explícitamente") y hace que sea imposible publicar un registro demo por un read-model nuevo |

```sql
-- pseudo-SQL de diseño: v_records_needing_reverification (DS-07)
CREATE VIEW v_records_needing_reverification AS
SELECT s.id, s.slug, s.source_id, s.last_verified_at,
       src.freshness_window_days,
       (now() - s.last_verified_at) AS age,
       (src.freshness_window_days * interval '1 day') < (now() - s.last_verified_at) AS overdue
  FROM scholarships s
  JOIN sources src ON src.id = s.source_id
 WHERE s.is_published AND s.is_demo = false AND s.deleted_at IS NULL
   AND s.last_verified_at IS NOT NULL
   AND (now() - s.last_verified_at) > (src.freshness_window_days * interval '1 day')
 ORDER BY s.last_verified_at ASC;
```

`needs_reverification` **no es una columna** (DS-07): es esta vista. Una columna de caducidad se desincroniza del `last_verified_at` que la justifica y además necesita conocer `sources.freshness_window_days`, que es política de fuente y no de registro.

---

## 2. Restricciones de base de datos

> Todas las restricciones de negocio que pueden convertirse en `CHECK` **son** `CHECK`. La razón está en ADR-004: "validar el gate solo en la aplicación" deja que cualquier ruta de escritura futura (import, script, migración) lo bypase. La DB es el único lugar donde no se puede esquivar.

### 2.1 CHECK de publicación (I1)

```sql
-- pseudo-SQL de diseño. Corrección de architecture §7.2 (ver H3).
ALTER TABLE scholarships ADD CONSTRAINT publish_requires_provenance CHECK (
  is_published = false
  OR (source_url IS NOT NULL
      AND last_verified_at IS NOT NULL
      AND source_licence IS NOT NULL
      AND source_licence <> 'NONE'
      AND source_id IS NOT NULL)
);
```

**Tres correcciones frente a §7.2:**

| Cambio | Motivo |
|---|---|
| `is_published = false` en vez de `NOT is_published` | `NOT NULL` evalúa a `NULL` cuando la columna es `NULL`, y un `CHECK` que da `NULL` **pasa**. Con `is_published` declarado `NOT NULL` ambos son equivalentes, pero la forma explícita no depende de esa declaración para ser correcta. **Cierra H3** |
| `source_licence <> 'NONE'` | `'NONE'` significa "no hay licencia". Aceptarla cumple la letra del CHECK y viola el propósito (legal §8.3: "no licence field ⇒ not publishable") |
| `AND source_id IS NOT NULL` | Sin fuente no hay provenance, y la procedencia es parte de la promesa de valor (§0 I3) |

### 2.2 CHECK de estado (I2)

```sql
-- Corrección de H3: si internal_status fuera NULL, NULL <> 'UNKNOWN' es NULL → el CHECK pasa.
ALTER TABLE scholarships ADD CONSTRAINT unknown_requires_reason CHECK (
  internal_status IS DISTINCT FROM 'UNKNOWN' OR status_reason IS NOT NULL
);

-- Coherencia del par de estado conocido (ADR-002e)
ALTER TABLE scholarships ADD CONSTRAINT last_known_status_pair CHECK (
  last_known_status_at IS NULL OR last_known_status IS NOT NULL
);

-- Un registro UNKNOWN conserva siempre la evidencia previa.
-- NO se implementa el "UNKNOWN no tiene countdown" con un CHECK que obligue a
-- deadline_at IS NULL: ese CHECK sería CORRECTO y DESTRUCTIVO a la vez, porque
-- las 16 filas F de §3.2 llevan cualquier registro verificado a UNKNOWN y
-- borrarian el deadline que ya habiamos verificado. Cada timeout de red
-- destruiria evidencia. (H4, ver abajo)
ALTER TABLE scholarships ADD CONSTRAINT unknown_keeps_evidence CHECK (
  internal_status <> 'UNKNOWN'
  OR last_known_status IS NOT NULL
  OR last_verified_at IS NULL          -- nunca verificado: no hay evidencia que preservar
);

-- needs_review sin motivo no es accionable
ALTER TABLE scholarships ADD CONSTRAINT needs_review_has_reason CHECK (
  needs_review = false OR needs_review_reason IS NOT NULL
);
```

**Por qué esto NO es un `CHECK`, y por qué eso no es una puerta trasera.** discovery §4.4 y R6 dicen que `UNKNOWN` nunca muestra countdown. Un `CHECK` parece la forma de hacerlo estructural, y aquí es donde el diseño se equivoca:

| Lo que haría el `CHECK` | Consecuencia |
|---|---|
| `UNKNOWN ⇒ deadline_at IS NULL AND deadline_basis = 'unknown' AND deadline_precision = 'UNKNOWN'` | Cada `timeout`, `dns_error`, `rate_limited` (F-01, F-02, F-12…) **destruye el deadline verificado** del registro. Un problema de red borra evidencia de la fuente. Peor: en el siguiente run correcto el deadline se rellena otra vez, y el usuario ve aparecer y desaparecer una fecha límite |
| `UNKNOWN ⇒ …` sin tocar el dato | Estructuralmente imposible: la DB no sabe qué renderiza el cliente |

**Regla adoptada (H4):** la DB **no** puede garantizar "no se muestra countdown" —eso es una propiedad del read-model— y **no debe** destruir datos para intentarlo. Lo que sí garantiza es lo inverso y lo que importa: **`UNKNOWN` nunca borra evidencia previa.** El "no mostrar countdown" se garantiza en el read-model (`v_scholarships_public`, §1.17), donde las seis condiciones de §4.2 se evalúan como expresiones y el resultado es `NULL` si alguna falla. Un read-model nuevo que olvide la condición produce un countdown sobre un `UNKNOWN`, y por eso hay un **test de regresión de vista** en §12 que falla si `countdown_label` no es `NULL` para todo registro `UNKNOWN`.

**H4 — cuarto hallazgo, añadido en Fase 4.** No estaba en `architecture §7.2`: el `CHECK` "correcto" de I5-I7 es ejecutable y tiene un coste de datos oculto. Se documenta aquí para que no se reintroduzca en Fase 5.

### 2.3 CHECK de deadline (I5) — **corrección de H2**

```sql
-- ERROR en Postgres: "functions in check constraint must be marked IMMUTABLE".
-- now() es STABLE. architecture §7.2 tal cual NO MIGRA.
ALTER TABLE scholarships ADD CONSTRAINT deadline_sane CHECK (
  deadline_at IS NULL
  OR (deadline_at > timestamptz '2000-01-01 00:00:00+00'
      AND deadline_at < timestamptz '2100-01-01 00:00:00+00')
);
```

**Corrección de H2.** La ventana "ahora + 5 años" de §7.2 no puede vivir en un `CHECK` porque `now()` no es inmutable. Dos opciones:

| Opción | Cómo | Veredicto |
|---|---|---|
| **A. Límite fijo** (adoptada) | `2000-01-01` … `2100-01-01` | Un `CHECK` puro, inmutable, valida en cualquier lado. El "5 años" deja de ser un predicado y pasa a ser un validador de aplicación que emite `DEADLINE_TOO_FAR` |
| B. Trigger | `BEFORE INSERT/UPDATE` con `now()` | Correcto, pero añade una puerta más que mantener y testear, y los triggers no se ven al leer el esquema |

**Opción A, con el matiz que la hace correcta:** el `CHECK` atrapa los valores **imposibles** (año 1970, año 3000, epoch sin inicializar). El validador de aplicación atrapa los **implausibles** (deadline a 6 años) y lo marca `needs_review` sin bloquear. Esta división es intencionada: la DB bloquea lo que no debería existir; el validador señala lo que debería revisarse. Un solo umbral no puede hacer ambos trabajos bien.

**Restricciones de deadline añadidas (I5):**

```sql
-- Sin base conocida no hay countdown. La base es parte de la definición del countdown.
ALTER TABLE scholarships ADD CONSTRAINT deadline_basis_required CHECK (
  deadline_at IS NULL OR deadline_basis <> 'unknown'
);

-- La precisión es obligatoria: es lo que impide el error de ±1 día (R6).
ALTER TABLE scholarships ADD CONSTRAINT deadline_precision_required CHECK (
  deadline_at IS NULL
  OR (deadline_precision <> 'UNKNOWN' AND deadline_tz IS NOT NULL)
);

-- El verbatim del editor se conserva SIEMPRE que hay deadline (ADR-004e).
ALTER TABLE scholarships ADD CONSTRAINT deadline_raw_text_required CHECK (
  deadline_at IS NULL OR deadline_raw_text IS NOT NULL
);

-- Una fecha numérica sin orden conocido no se resuelve.
ALTER TABLE scholarships ADD CONSTRAINT deadline_ambiguous_date CHECK (
  deadline_at IS NULL OR deadline_date_order IS NOT NULL
);

-- opening_date no puede ser posterior al deadline (salvo mismo día, por zona horaria)
ALTER TABLE scholarships ADD CONSTRAINT opening_before_deadline CHECK (
  opening_date IS NULL OR deadline_at IS NULL
  OR (deadline_at AT TIME ZONE 'UTC')::date >= opening_date
);
```

**Sobre el último `CHECK`:** se evalúa en UTC a propósito, no en `deadline_tz`. Si una convocatoria abre el 1 de marzo en España y cierra el 28 de febrero en Manila, la diferencia real es de días. Comparar en `deadline_tz` daría falsos positivos en la frontera; comparar en UTC es el piso común y conservador. Un `CHECK` de días **no puede** afirmar un orden absoluto entre dos fechas en zonas distintas — para eso está `deadline_tz` + la conversión en el motor de deadline (§4).

### 2.4 CHECK de duplicados y demo

```sql
-- Ya en architecture §7.2. Se conserva literalmente.
CREATE UNIQUE INDEX one_canonical_per_group
  ON duplicate_members (duplicate_group_id) WHERE is_canonical;

-- ADD: un registro no puede estar en dos grupos (cierra la ambigüedad que M6 no detectaría)
ALTER TABLE duplicate_members ADD CONSTRAINT one_group_per_scholarship
  UNIQUE (scholarship_id);

-- architecture §12: un demo jamás se publica
ALTER TABLE scholarships ADD CONSTRAINT demo_never_published CHECK (
  is_demo = false OR is_published = false
);
```

### 2.5 CHECK de integridad de campo

```sql
ALTER TABLE scholarships ADD CONSTRAINT amount_positive   CHECK (amount IS NULL OR amount > 0);
ALTER TABLE scholarships ADD CONSTRAINT slug_format       CHECK (slug ~ '^[a-z0-9][a-z0-9-]{4,63}$');
ALTER TABLE scholarships ADD CONSTRAINT version_positive CHECK (version >= 1);
ALTER TABLE scholarships ADD CONSTRAINT content_hash_shape CHECK (content_hash IS NULL OR content_hash ~ '^[0-9a-f]{64}$');

-- Sin borrado silencioso (security §6.1)
ALTER TABLE scholarships ADD CONSTRAINT delete_requires_reason CHECK (
  deleted_at IS NULL OR delete_reason IS NOT NULL
);

-- No se borra nada que esté publicado: primero se despublica
ALTER TABLE scholarships ADD CONSTRAINT delete_requires_unpublish CHECK (
  deleted_at IS NULL OR is_published = false
);

-- URL oficial: solo esquema http/https. Nunca javascript:, data:, file: (security §10.1)
ALTER TABLE scholarships ADD CONSTRAINT source_url_scheme CHECK (
  source_url IS NULL OR source_url ~ '^https?://'
);
ALTER TABLE scholarships ADD CONSTRAINT official_url_scheme CHECK (
  official_url IS NULL OR official_url ~ '^https?://'
);

-- Nunca se referencia a sí mismo como fuente (legal §8.5)
ALTER TABLE scholarships ADD CONSTRAINT no_self_reference CHECK (
  possible_duplicate_of IS NULL OR possible_duplicate_of <> id
);
```

### 2.6 Enums, FKs y case

**Enums como `CHECK` sobre `text`, no como tipos ENUM de Postgres.** Motivo: añadir un valor a un enum de Postgres es un `ALTER TYPE` que puede requerir downtime; un `CHECK` es un `ALTER TABLE … DROP/ADD CONSTRAINT` online. Con un corpus que puede crecer post-MVP (niveles nuevos, funding types nuevos) esa flexibilidad importa. El coste es que el validador de aplicación debe_referencear la misma lista; se mitiga con una tabla de lookup `enum_values` que sirve tanto al `CHECK` (vía trigger de validación) como a los validadores. En MVP la duplicación lista-en-TS/lista-en-SQL es aceptable y se cubre con un test de paridad.

**FKs — additions sobre el ERD:**

| FK | Acción | Motivo |
|---|---|---|
| `scholarships.source_id → sources(id)` | `ON DELETE SET NULL` | Una fuente retirada no debe borrar becas reales |
| `scholarships.possible_duplicate_of → scholarships(id)` | `ON DELETE SET NULL` | Señal, no dependencia fuerte |
| `scholarships.duplicate_group_id → duplicate_groups(id)` | `ON DELETE SET NULL` | Nunca se borra un grupo con historia; se disocian |
| `duplicate_members.duplicate_group_id → duplicate_groups(id)` | `ON DELETE CASCADE` | — |
| `duplicate_members.scholarship_id → scholarships(id)` | `ON DELETE CASCADE` | Un miembro sin registro es basura |
| `field_provenance.scholarship_id → scholarships(id)` | `ON DELETE CASCADE` | — |
| `field_provenance.source_id → sources(id)` | `ON DELETE SET NULL` | — |
| `field_provenance.run_id → sync_runs(id)` | `ON DELETE SET NULL` | Un run purgado no debe borrar la procedencia |
| `status_history.scholarship_id → scholarships(id)` | `ON DELETE RESTRICT` | 🔒 **El historial sobrevive al registro**. Con `RESTRICT` el borrado físico de un registro con historial es imposible por la DB |
| `audit_trail.scholarship_id → scholarships(id)` | `ON DELETE RESTRICT` | 🔒 Igual |
| `record_versions.scholarship_id → scholarships(id)` | `ON DELETE CASCADE` | — |
| `user_scholarships.scholarship_id → scholarships(id)` | `ON DELETE CASCADE` | — |
| `sync_runs.source_id → sources(id)` | `ON DELETE CASCADE` | — |
| `fetch_log.run_id → sync_runs(id)` | `ON DELETE CASCADE` | — |
| `deadline_tz → timezones(name)` | `RESTRICT` | Impide zonas inventadas |

**El `RESTRICT` en `status_history` y `audit_trail` es la decisión de diseño más importante de esta sección.** Significa que la DB **físicamente no permite** perder la cadena de estados de un registro que tuvo historial. El "soft delete" deja de ser una convención del código y pasa a ser la **única** vía posible de retirada. Con `CASCADE` (el default tentador) un `DELETE` futuro —un script de limpieza, un error— borraría la evidencia de R3 sin dejar rastro.

### 2.7 Triggers de inmutabilidad

```sql
-- pseudo-SQL de diseño

-- Append-only: bloquea UPDATE y DELETE
CREATE FUNCTION block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Tabla % es append-only: % rechazado', TG_TABLE_NAME, TG_OP;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER status_history_append_only
  BEFORE UPDATE OR DELETE ON status_history
  FOR EACH ROW EXECUTE FUNCTION block_mutation();

CREATE TRIGGER audit_trail_append_only
  BEFORE UPDATE OR DELETE ON audit_trail
  FOR EACH ROW EXECUTE FUNCTION block_mutation();

CREATE TRIGGER fetch_log_append_only
  BEFORE UPDATE OR DELETE ON fetch_log
  FOR EACH ROW EXECUTE FUNCTION block_mutation();

-- is_demo inmutable (architecture §12: "un registro demo no se convierte en real")
CREATE TRIGGER is_demo_immutable
  BEFORE UPDATE OF is_demo ON scholarships
  FOR EACH ROW WHEN (OLD.is_demo IS DISTINCT FROM NEW.is_demo)
  EXECUTE FUNCTION block_mutation();
```

**El trigger de `is_demo` es una decisión de integridad de datos, no de UI.** `architecture §12` dice que la transición "nunca dejamos de marcarlo"; un trigger convierte esa frase en algo que no depende de la disciplina de quien escriba la siguiente migración.

**Rollback del trigger:** para un soft delete se usa `deleted_at`, nunca `DELETE`. Un `DELETE` físico sobre `scholarships` con historial dispara el `RESTRICT` de §2.6 y **falla**, que es el comportamiento correcto.

### 2.8 Índices

Cada índice existe para una query concreta. La columna "Query que sirve" es la justificación: **no se añade un índice sin nombrar la consulta que lo usa.**

| Índice | Definición (pseudo-SQL) | Query que sirve |
|---|---|---|
| `scholarships_fts` | `GIN (search_vector)` | Q1 búsqueda full-text (M2) |
**Un solo índice de texto.** No se crea un segundo GIN "sin acentos": `search_vector` ya se construye con `unaccent` (§2.9), así que el índice único cubre las dos consultas. Un segundo índice duplicaría el coste de escritura de cada cambio de título para servir una query que el primero ya responde.
| `scholarships_open_by_deadline` | `btree (deadline_at) WHERE is_published AND is_demo = false AND internal_status IN ('OPEN','UPCOMING')` | Q3 countdown / deadline window |
| `scholarships_by_source_freshness` | `btree (source_id, last_verified_at DESC)` | Q4 freshness por fuente (M4) |
| `scholarships_by_source_open` | `btree (source_id) WHERE is_published AND is_demo = false` | Métricas M3/M5 por fuente |
| `scholarships_public_listing` | `btree (internal_status, deadline_at) WHERE is_published AND is_demo = false AND deleted_at IS NULL` | Filtro por estado + orden por deadline (Q1) |
| `scholarships_by_country` | `btree (country_iso2) WHERE is_published AND is_demo = false` | Faceta de país / coropleta |
| `scholarships_by_level` | `btree (level) WHERE is_published AND is_demo = false` | Faceta de nivel |
| `scholarships_by_funding` | `btree (funding_type) WHERE is_published AND is_demo = false` | Faceta de financiación |
| `scholarships_needs_review` | `btree (last_verified_at) WHERE needs_review = true` | Cola de revisión |
| `scholarships_stale` | `btree (last_verified_at) WHERE is_published AND is_demo = false` | Q4 aging / v\_records\_needing\_reverification |
| `scholarships_destination_countries` | `GIN (destination_countries)` | Filtro multi-país |
| `scholarships_fields` | `GIN (fields)` | Filtro por área |
| `scholarships_possible_dup` | `btree (possible_duplicate_of) WHERE possible_duplicate_of IS NOT NULL` | Cola de triage de duplicados (DS-08) |

**Sobre `unaccent`:** el `search_vector` generado de ADD-11 necesita `unaccent` disponible. En Neon y Supabase requiere `CREATE EXTENSION unaccent`. Si no estuviera disponible, el fallback es `to_tsvector('simple', ...)` sin accents, con peor recall en español. La disponibilidad de la extensión se verifica **antes** de la migración, no se asume.

**Sobre el índice GiST solicitado — decisión explícita de no usarlo para fechas, y qué se haría si hiciera falta.** El brief pide "GiST para rango de fechas". En este modelo **no aporta nada**, y por eso no se crea:

- GiST sobre `tstzrange` sirve consultas de **solapamiento de intervalos** (`deadline && tstzrange(...)`). El producto no tiene tales consultas: los deadlines son **puntos**, no intervalos, y no hay "disponibilidad durante un periodo" que modelar.
- Un GiST simple sobre `timestamptz` sería **inferior** a btree para igualdad y rango: peor lectura y bastante más caro en escritura.
- A 300–5000 filas, `btree (deadline_at)` resuelve cualquier rango en una lectura de índice; la elección vendría por tamaño, no por tipo de índice.

**Dónde sí tendría sentido GiST, si el modelo crece.** El día que exista un campo de tipo rango **real** y una query que lo use —periodo de matrícula, ventana de vigencia de una beca, "becas con solapamiento en este periodo"— la forma correcta es:

```sql
-- SOLO si aparece la columna y la query. No se añade por simetría.
ALTER TABLE scholarships ADD COLUMN deadline_window tstzrange
  GENERATED ALWAYS AS (tstzrange(opening_at, deadline_at, '[)')) STORED;
CREATE INDEX scholarships_window_gist ON scholarships USING GIST (deadline_window);
-- query: WHERE deadline_window && tstzrange(:from, :to, '[)')
```

Esa columna **no existe hoy** y no se añade sin la query que la usaría: un índice sin consulta es coste de escritura sin valor. Reevaluar cuando el `EXPLAIN` de la Q3 (§7.1) deje de resolver en un índice.

**Índices que deliberadamente NO se crean:** GIN sobre `coverage` (filtro poco usado, y el array cabe en la fila), índice sobre `title` como btree (no se busca por igualdad), índice sobre `fields` en btree (es array, necesita GIN). Añadirlos sería coste de escritura sin consulta que los justifique.

### 2.9 GIN/tsvector — el `search_vector` generado

```sql
-- pseudo-SQL de diseño (ADD-11)
-- Un solo vector, multilingüe ponderado: evita la explosión de índices por idioma (AR-3)
ALTER TABLE scholarships ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
      setweight(to_tsvector('spanish', unaccent(coalesce(title, ''))),     'A')
   || setweight(to_tsvector('simple',  unaccent(coalesce(provider, ''))),  'B')
   || setweight(to_tsvector('spanish', unaccent(coalesce(university, ''))),'B')
   || setweight(to_tsvector('simple',  unaccent(array_to_string(coalesce(fields, ARRAY[]::text[]), ' '))), 'C')
  ) STORED;

CREATE INDEX scholarships_fts ON scholarships USING GIN (search_vector);
```

**Por qué una columna generada y no el índice de expresión de `architecture §7.2`:** con un índice de expresión, **la expresión de ranking en el query debe coincidir byte a byte con la del índice**. Si divergen, Postgres no da error: da **resultados relevantes pero mal ordenados**, y nadie se da cuenta. Con una columna generada, la expresión está escrita una vez. Es la misma clase de error que un `CHECK` con `now()`: silencioso y difícil de detectar.

**Por qué `spanish` + `simple` y no solo `spanish`:** el corpus mezcla español (curación) e inglés (feed EACEA, Chevening,.consorcios europeos). `spanish` Apply stemming a "deadline" y da un lema español; `simple` no lematiza. Ponderar `title` con `spanish` y `provider` con `simple` cubre ambos sin mantener dos índices GIN. `AR-3` está satisfecha con esto más el fallback a `simple` para tokens cortos.

**`unaccent` no es `IMMUTABLE` por defecto:** `to_tsvector('spanish', unaccent(x))` en una columna generada **STORED** requiere marcar `unaccent` como inmutable, lo que Postgres no permite sin una función wrapper `IMMUTABLE`. Este es un detalle de implementación real que **no puede resolverse en un documento de diseño**; queda marcado como punto a verificar en Fase 7 (Fase 5 implementa). Si resultara problemático, el plan B es un índice de `md5` de `title_normalized` para lookups exactos más FTS con `simple` solamente. Lo que **no** se hace es dejar `unaccent` fuera en silencio: AR-3 depende de ello.

### 2.10 Revocación de columnas y lectura pública

```sql
-- pseudo-SQL de diseño

-- 1) El rol de lectura no tiene NINGÚN privilegio sobre la tabla base.
REVOKE ALL ON scholarships FROM app_readonly;

-- 2) La superficie pública se concede sobre la VISTA, no sobre columnas.
--    (Por qué no un GRANT/REVOKE por columnas: al final de esta sección.)
GRANT SELECT ON v_scholarships_public TO app_readonly;

-- 3) Tablas internas: nunca salen del servidor
REVOKE ALL ON fetch_log             FROM app_readonly;
REVOKE ALL ON sync_runs             FROM app_readonly;
REVOKE ALL ON field_provenance      FROM app_readonly;
REVOKE ALL ON audit_trail           FROM app_readonly;
REVOKE ALL ON status_history        FROM app_readonly;
REVOKE ALL ON record_versions       FROM app_readonly;
REVOKE ALL ON search_events         FROM app_readonly;
REVOKE ALL ON validation_violations FROM app_readonly;
REVOKE ALL ON duplicate_groups      FROM app_readonly;
REVOKE ALL ON duplicate_members     FROM app_readonly;

-- 4) El rol de escritura NO es app_readonly. Es un rol distinto (ingest_write) con:
--      INSERT/UPDATE en scholarships · SIN DELETE en ninguna tabla
--      · INSERT (nunca UPDATE/DELETE) en audit_trail, status_history, fetch_log
--    La asimetría es intencionada: el worker escribe hechos, no borra evidencia (§2.7).
```

**Por qué `REVOKE ALL` sobre la tabla y no un `REVOKE` por columnas.** La forma de `architecture §7.2` (revocar columnas una a una sobre la tabla completa) tiene dos fallos:

| | `REVOKE` por columnas | `REVOKE ALL` sobre la tabla + `GRANT` sobre la vista |
|---|---|---|
| Una columna nueva | Si nadie la revoca, **se expone por `SELECT *`** sin que nada falle | No se expone: el rol no tiene privilegio de tabla, y la vista solo proyecta lo que nombra |
| Roles | El mismo rol lee y escribe, salvo excepciones columbradas | Lectura y escritura son roles distintos por construcción |
| Esfuerzo | Crece con cada columna nueva | Crece con cada **campo público nuevo**, que es una decisión de producto, no un olvido |

**El contrato de columnas pasa de `GRANT` a la definición de la vista.** La lista de campos que `v_scholarships_public` proyecta **es** la superficie pública, y arranca del mapper campo-a-campo de `architecture §10.6`. Sobre esa lista, Fase 4 añade los campos que las tarjetas de decisión de `discovery §9.4` necesitan y que §10.6 todavía no nombra:

| Campo añadido a la vista | Por qué |
|---|---|
| `university`, `modality`, `coverage`, `destination_countries`, `duration_months`, `ects` | Son datos del catálogo oficial que §10.6 omite; sin ellos la tarjeta es más pobre que la fuente |
| `official_url`, `application_url` | Son el destino del CTA. `source_url` dice de dónde **sacamos** el dato; estos dicen a dónde **va** el usuario |
| `deadline_precision`, `deadline_tz` | Sin ellos el countdown no se puede calcular ni auditar en cliente (§4) |
| `source_licence` | Atribución legal obligatoria (`legal-matrix §8.3`). Tiene que viajar al cliente |
| `status_confidence`, `cycle_label` | `status_confidence` alimenta el badge de "estado sin verificar"; `cycle_label` desambigua ciclos (Chevening 2026 vs 2027, §5.3) |

**Y explícitamente nunca en la vista** (por construcción, no por `REVOKE`): `notes_internal`, `needs_review`, `needs_review_reason`, `legal_clearance`, `discovered_via`, `delete_reason`, `possible_duplicate_of`, `duplicate_group_id`, `curator`, `curated_at`, `content_hash`, `version`, `resolved_ip`, `error_class`.

> **Por qué no `REVOKE ALL (col, …) ON scholarships`:** es sintaxis válida de Postgres, pero solo surte efecto si el rol tiene **antes** el privilegio de columna. Eso obliga a `GRANT` por columnas y después `REVOKE` por columnas para las internas: dos listas que hay que mantener sincronizadas y que se rompen en silencio con cada columna nueva. La vista hace el mismo trabajo con una sola lista y con fallo ruidoso.

**`v_scholarships_public` incluye `is_demo = false` como filtro (no como columna).** `architecture §12` dice "toda consulta pública incluye `is_demo = false` explícitamente, nunca se olvida el filtro". Con la vista, **no hay forma de olvidarlo**: es la única vía de lectura. La columna `is_demo` se expone para el badge en superficies de demo, pero la vista de producción tiene el filtro incorporado y solo el rol de staging puede ver los registros demo.

### 2.11 Orden de migración

Las restricciones se crean en el orden que permite aplicarlas sobre un corpus existente sin invalidar filas.

| # | Paso | Nota |
|---|---|---|
| 1 | Extensiones (`unaccent` — `pg_trgm` **no** se instala: DS-09 aplaza el fuzzy matching) | Verificar disponibilidad antes |
| 2 | `sources`, `countries`, `timezones`, `duplicate_groups` | Tablas base, sin dependientes |
| 3 | `scholarships` sin FKs a `sources` | Para que la carga inicial no dependa del orden |
| 4 | Backfill de `source_id`, `cycle_label`, `deadline_precision` | **Todo backfill nuevo es `NULL` o `'UNKNOWN'`, nunca un valor inventado.** Un campo nuevo desconocido se rellena con el valor honesto |
| 5 | FKs de `scholarships` | — |
| 6 | Tablas hijas (`field_provenance`, `record_versions`, `status_history`, `audit_trail`, `duplicate_members`, `sync_runs`, `fetch_log`, `validation_violations`, `search_events`, `user_scholarships`, `shortlist_shares`) | — |
| 7 | Vistas | — |
| 8 | `CHECK`constraints | Los que ocupan datos se aplican **al final** |
| 9 | Triggers de inmutabilidad | Al final: los triggers de append-only bloquean la carga inicial si se crean antes |
| 10 | Índices | `CREATE INDEX CONCURRENTLY` en tablas grandes; irrelevante a 300 filas pero es el patrón correcto desde el día 1 |
| 11 | `REVOKE` / `GRANT` | **Siempre al final.** Un `REVOKE` prematuro rompe la carga |

**Sobre el paso 4 (backfill).** Es el punto donde un proyecto de datos suele romper sus propias reglas: "añadimos `source_id` y rellenamos el valor más probable". La regla es dura: **`source_id` se backfillea solo donde la procedencia es inequívoca** (el registro viene de un run de EACEA que consta en `sync_runs`); en caso de duda queda `NULL`, y `NULL` en `source_id` significa que `is_published = false` (§2.1). **Un registro sin fuente conocida se despublica; no se le inventa una.**

---

## 3. Motor de estado `resolveStatus()`

> **D4 / ADR-002 — no negociable.** `resolveStatus(evidence) → {status, confidence, reason, preserveLastKnown}` es una **función pura**: sin I/O, sin `Date.now()`, sin DB. La tabla siguiente es su especificación completa. Se implementa en `core/status/` y laForbidden de importar `adapters/`, `db/`, `next/*` (architecture §6.2) es lo que hace verificable su pureza.

### 3.1 Restricciones garantizadas estructuralmente

Tres invariantes que **no dependen de la disciplina al escribir el código**, sino de la forma de la función:

| Invariante | Cómo se garantiza estructuralmente |
|---|---|
| **Ningún `fetchOutcome` no-`ok` produce `OPEN`** | La primera rama de la función evalúa el `fetchOutcome` **antes de mirar ninguna evidencia de contenido**, y retorna `UNKNOWN` para los 16 valores de fallo. El contenido no se lee. No hay forma de que un `OPEN` salga de un fallo, ni siquiera por error de indentación en un caso nuevo |
| **Ningún fallo produce `CLOSED`** | Ídem, y además `CLOSED` **solo** es alcanzable desde `sourceExplicitlySaysClosed = true` o `sourceStatus = 'CLOSED'` (fila C-1), es decir, únicamente desde evidencia allowlisted |
| **`UNKNOWN` siempre tiene `reason`** | El tipo de retorno `ResolvedStatus` declara `reason: string` no-nullable, y el `CHECK unknown_requires_reason` (§2.2) lo verifica en la DB. La invariante está en tres capas: tipo, función, constraint |

### 3.2 Tabla exhaustiva: 16 `fetchOutcome` de fallo

> **Verificación de cobertura:** el tipo `FetchOutcome` de `architecture §8` declara **18** valores. El brief de Fase 4 lista **17** y omite **`connection_refused`**. Se incluye aquí. Los 18 están cubiertos: 2 de éxito (C-ramas) + 16 de fallo (esta tabla).

| # | `fetchOutcome` | `sourceStatus` (cualquiera) | `deadlineBasis` (cualquiera) | `openingDate` (cualquiera) | **Estado** | **Confianza** | **`reason`** (ejemplo de copy) | **`preserveLastKnown`** | `needs_review` |
|---|---|---|---|---|---|---|---|---|---|
| F-01 | `timeout` | — | — | — | `UNKNOWN` | `HIGH` | `No pudimos contactar con la fuente (tiempo de espera agotado)` | `true` | `true` |
| F-02 | `dns_error` | — | — | — | `UNKNOWN` | `HIGH` | `No se pudo resolver el dominio de la fuente` | `true` | `true` |
| F-03 | `connection_refused` | — | — | — | `UNKNOWN` | `HIGH` | `La fuente rechazó la conexión` | `true` | `true` |
| F-04 | `tls_error` | — | — | — | `UNKNOWN` | `HIGH` | `No se pudo establecer una conexión segura con la fuente` | `true` | `true` |
| F-05 | `http_4xx` | — | — | — | `UNKNOWN` | `MEDIUM` | `La fuente respondió con un error (HTTP {code})` | `true` | `true` |
| F-06 | `http_5xx` | — | — | — | `UNKNOWN` | `HIGH` | `La fuente está temporalmente caída` | `true` | `false` |
| F-07 | `too_large` | — | — | — | `UNKNOWN` | `HIGH` | `La respuesta superó el límite de tamaño permitido` | `true` | `true` |
| F-08 | `blocked_scheme` | — | — | — | `UNKNOWN` | `HIGH` | `Bloqueado por política de seguridad (esquema no permitido)` | `true` | `true` |
| F-09 | `blocked_host` | — | — | — | `UNKNOWN` | `HIGH` | `Bloqueado por política de seguridad (host no permitido)` | `true` | `true` |
| F-10 | `blocked_ip` | — | — | — | `UNKNOWN` | `HIGH` | `Bloqueado por política de seguridad (dirección no permitida)` | `true` | `true` |
| F-11 | `redirect_violation` | — | — | — | `UNKNOWN` | `HIGH` | `La fuente redirigió a un destino no permitido` | `true` | `true` |
| F-12 | `rate_limited` | — | — | — | `UNKNOWN` | `HIGH` | `La fuente pidió limitar el ritmo de consulta` | `true` | `false` |
| F-13 | `circuit_open` | — | — | — | `UNKNOWN` | `HIGH` | `La fuente está en pausa por errores repetidos` | `true` | `false` |
| F-14 | `content_type_rejected` | — | — | — | `UNKNOWN` | `HIGH` | `La fuente devolvió un tipo de contenido no esperado` | `true` | `true` |
| F-15 | `challenge_page` | — | — | — | `UNKNOWN` | `HIGH` | `La fuente nos mostró una página de verificación` | `true` | `true` |
| F-16 | `budget_exhausted` | — | — | — | `UNKNOWN` | `HIGH` | `No se alcanzó esta verificación en esta pasada (tiempo/solicitudes agotados)` | `true` | `false` |

**Columnas de la tabla que necesitan explicación:**

- **`sourceStatus` / `deadlineBasis` / `openingDate` = "—".** No es que valgan cualquier valor: es que **la función no los lee**. Las tres columnas existen para hacer explícito que la evidencia de contenido es irrelevante cuando el fetch falló. Esto es lo que convierte "no se produce `OPEN`" en una propiedad de la arquitectura de la función, no en una convención de escritura.
- **`preserveLastKnown = true` en las 16 filas.** Es la aplicación directa de ADR-002(e): el último estado con evidencia sobrevive intacto. `last_known_status` se escribe con `internal_status` solo cuando hay evidencia.
- **`confidence = HIGH` no significa "estamos seguros de que está abierta".** Significa "estamos seguros de que **no se puede verificar ahora**". Es una confianza sobre el `UNKNOWN`, no sobre el programa. La UI nunca muestra `confidence` al usuario; es metadato de diagnóstico.
- **`needs_review` varía (segunda columna a la derecha).** F-06, F-12, F-13 y F-16 son fallos **transitorios esperados**: no merecen una tarea de revisión humana, sino un reintento con backoff. Los demás (timeout, DNS, TLS, 4xx, too_large, blocked_*, challenge) son **señal de algo roto** — la fuente cambió, el markup cambió, o una política de seguridad bloqueó algo que alguien debe mirar. Esta distinción evita que la cola de revisión se llene de ruido y se vuelva inútil.
- **`F-05` tiene confianza `MEDIUM`, no `HIGH`.** Un 404 puede ser "la página se movió" (problema estructural, hay que revisar) o "el servidor tiene un error 404 raro" (transitorio). Un 5xx es inequívocamente transitorio. Distinguirlo evita que la cola de revisión se llene de falsos positivos.
- **`F-16 budget_exhausted` merece una nota aparte.** No es un fallo de la fuente: es nuestro. Un presupuesto de run agotado no dice nada sobre el estado de la beca. Por eso `reason` habla de la **ejecución**, no de la fuente, y `needs_review = false`. El `preserveLastKnown = true` es lo que evita que un run con presupuesto apretado degrade el corpus entero.

### 3.3 Tabla exhaustiva: 2 `fetchOutcome` de éxito

Cuando el fetch tiene éxito (`ok` o `not_modified`), la función pasa a evaluar la **evidencia de contenido** en el orden de precedencia de §3.4. Estas son las filas de ese orden, con los dos valores de `fetchOutcome` que las habilitan.

| Regla | Condición de entrada | **Estado** | **Confianza** | **`reason`** | **`preserveLastKnown`** |
|---|---|---|---|---|---|
| S-1 | `sourceStatus = 'CLOSED'` **o** `sourceExplicitlySaysClosed` | `CLOSED` | `HIGH` | `La fuente indica que las solicitudes están cerradas` | `false` |
| S-2 | `sourceStatus = 'PAUSED'` **o** `sourceExplicitlySaysPaused` | `PAUSED` | `HIGH` | `La fuente indica que la convocatoria está suspendida` | `false` |
| S-3 | `sourceStatus = 'UPCOMING'` | `UPCOMING` | `HIGH` | `La fuente anuncia la convocatoria y aún no está abierta` | `false` |
| S-4 | `sourceStatus = 'OPEN'` **y** `openingDate` en el pasado **y** (`deadlineBasis = 'unknown'` **o** `deadline_at` `NULL`) | `OPEN` | `HIGH` | `La fuente indica que las solicitudes están abiertas` | `false` |
| S-5 | `sourceStatus = 'OPEN'` **y** `deadline_at` en el pasado | `UNKNOWN` | `MEDIUM` | `La fuente dice abierta pero el deadline ya pasó · requiere revisión` | `true` |
| S-6 | `sourceStatus = 'OPEN'` **y** `deadlineBasis = 'inferred_from_cycle'` | `UNKNOWN` | `LOW` | `No hay deadline confirmado por la fuente · requiere revisión` | `true` |
| S-7 | `sourceStatus = 'OPEN'` **o** (`deadline_at` en el futuro **y** `deadlineBasis = 'publisher_stated'`) | `OPEN` | `HIGH` / `MEDIUM` | `La fuente indica abierta` / `El deadline aún no ha pasado` | `false` |
| S-8 | `openingDate` en el futuro **y** `deadline_at` en el futuro | `UPCOMING` | `MEDIUM` | `La convocatoria aún no ha abierto` | `false` |
| S-9 | `deadline_at` en el pasado **y** `deadlineBasis = 'publisher_stated'` **y** la fuente no afirma `OPEN` | `EXPIRED` | `MEDIUM` | `El deadline de solicitudes ya pasó` | `false` |
| S-10 | `deadline_at` en el pasado **y** `deadlineBasis = 'inferred_from_cycle'` | `UNKNOWN` | `LOW` | `El deadline estimado ya pasó · requiere revisión` | `true` |
| S-11 | **Ninguna** condición anterior: sin estado de fuente, sin deadline, o deadline `NULL` | `UNKNOWN` | `LOW` | `Sin información suficiente para determinar el estado` | `true` |

**Notas sobre las filas:**

- **S-7 es la única fila que puede producir `OPEN` sin que la fuente lo diga**, y solo cuando `deadline_at` (con `publisher_stated`) **no ha pasado todavía**. discovery §4.3 lo permite: "`OPEN` = fuente explícita, **o** deadline vigente y fuente sin contradicción". La clave es "vigente": un deadline en el futuro **no** produce `OPEN` por sí mismo (eso sería `S-8`, `UPCOMING`). Un deadline en el pasado tampoco produce `OPEN` (eso sería `EXPIRED` o `UNKNOWN`).
- **S-5 y S-10 son filas de conflicto.** La fuente dice abierta pero la evidencia de fecha la contradice. discovery §4.3 dice "Duda general → `UNKNOWN`". Un conflicto entre dos señales de la misma fuente **es** duda. No se elige la más favorable.
- **`OPEN` nunca sale de S-5, S-6, S-10 ni de ninguna fila F.** Verificado: la última fila que produce `OPEN` es S-7, y S-7 requiere `fetchOutcome ∈ {ok, not_modified}` por construcción (las filas F retornan antes de evaluar contenido).
- **S-9 es `EXPIRED`, no `CLOSED`.** El diseño de 6 estados distingue "la fuente **dice** que está cerrada" (S-1, evidencia directa) de "el deadline pasó y la fuente no dice lo contrario" (S-9, inferencia del calendario). La diferencia importa: `EXPIRED` es un estado que **no instruye a postular** (riesgo bajo) mientras que un `CLOSED` erróneo es una afirmación fuerte.

### 3.4 Orden de precedencia (la regla que la tabla codifica)

La tabla de §3.3 no es un conjunto de reglas que se evalúan en cualquier orden: es una **ladder**. El orden importa, y está elegido para que el estado más conservador posible gane cuando hay ambigüedad.

```
1. fetchOutcome ∈ 16 fallos          → UNKNOWN           (§3.2, cortocircuita)
2. CLOSED explícito                   → CLOSED
3. PAUSED explícito                   → PAUSED
4. UPCOMING explícito                 → UPCOMING
5. openingDate futuro                 → UPCOMING
6. OPEN explícito + contradicción    → UNKNOWN           (S-5, S-6)
7. OPEN explícito (sin contradicción) → OPEN
8. deadline futuro (publisher_stated) → OPEN  (MEDIUM)
9. deadline pasado (publisher_stated) → EXPIRED
10. nada concluyente                 → UNKNOWN
```

**Por qué CLOSED gana sobre OPEN.** Si una fuente dice "cerrado" y su deadline dice "mañana", gana "cerrado". Motivo: **el estado explícito de la fuente es la evidencia más directa que tenemos.** Un deadline calculado es una inferencia nuestra; un "closed" en el texto es una declaración del editor. Cuando discrepan, la declaración gana.

**Por qué OPEN explícito no se resuelve a favor de la fecha.** discovery §4.3 enuncia esto directamente: "Nunca `OPEN` por fecha futura". La fila S-5 lo implementa: OPEN + deadline pasado = `UNKNOWN` + `needs_review`, no `OPEN`. El motivo es **de producto, no de lógica**: si la fuente dice "abierta" pero el deadline visible en la misma página ya pasó, el usuario ve un mensaje contradictorio. Cuál de los dos es cierto, no lo sabemos. Decir "abierta" con un countdown negativo al lado es peor que decir "no verificable ahora" y dejar que el usuario haga clic en la fuente.

### 3.5 Definiciones de los predicados

La tabla usa predicados que deben tener una definición exacta, porque cada uno es un lugar donde un error de implementación se convierte en un error de estado.

| Predicado | Definición precisa | Nota de implementación |
|---|---|---|
| "en el pasado" | `deadline_at < now()` | `now()` inyectado por `SyncContext`, no `Date.now()` |
| "en el futuro" | `deadline_at > now()` | — |
| "openingDate en el futuro" | `openingDate > today(now, tz del lector)` | `opening_date` es `date` (sin hora), se compara con la fecha local del lector. `opening_date` **no** se convierte a `timestamptz`: hacerlo inventaría una hora que la fuente no dio |
| "contradice" | `sourceStatus ∈ {OPEN, UPCOMING}` ∧ `deadline_at` no nulo ∧ `deadline_at < now()` | Un `deadline` `NULL` **no** contradice: ausencia de evidencia no es evidencia de ausencia |
| "explícito" | El valor proviene de un campo allowlisted de la fuente Y el adapter registró su `source_field_path` | Nunca de un valor inferido del cuerpo del texto |

**El último punto es la diferencia entre S-1 y S-9.** "Explícito" significa que un campo concreto del XML o de la página lo declara, con su path registrado en `field_provenance`. Si el adapter tiene que buscar una frase en prosa para decidir si está cerrado, **no es evidencia allowlisted** y la fila no aplica. Este es el mecanismo por el que `security §6.1` "status comes from an explicit enum field the source publishes" se vuelve verificable en vez de aspiracional.

### 3.6 Dos salidas que la tabla no captura, y por qué

Hay dos estados de la evidencia que no son "fallo de fetch" ni "evidencia válida", y que la tabla no debe forzar a un lado:

**a) Fuente en `kill_switch = true`.** Si un operador activa el kill switch (R3 playbook), la fuente deja de syncarse. `fetchOutcome` en ese caso es `circuit_open` (F-13), que da `UNKNOWN` — pero el **`reason` visible para el usuario no debería ser "la fuente está en pausa por errores repetidos"**, porque no hubo errores. La distinción se hace en la capa de presentación: el read-model consulta `sources.kill_switch` y sustituye el copy por "Verificación pausada temporalmente". El estado sigue siendo `UNKNOWN`, que es correcto. `UNKNOWN` no significa "falló": significa "no lo sabemos ahora", y hay motivos distintos para no saberlo.

**b) `not_modified` con `last_verified_at` antigua.** Un `304 Not Modified` es un fetch exitoso: la fuente confirmó que su contenido no cambió. Actualizar `last_verified_at` en un `304` sería **una mentira técnica**: no re-leímos nada. La regla es: `not_modified` actualiza `last_seen_at` (y por tanto la señal de "lo hemos visto") pero **no** `last_verified_at`, que solo se mueve cuando hay contenido nuevo (`ok` con `parse_ok`). Esto significa que un registro cuyo `ETag` no cambia durante 30 días envejece visiblemente aunque su fuente esté sana — que es exactamente lo que el usuario necesita saber: que no leemos esto desde hace un mes, no que la página no cambió.

### 3.7 Matriz de tests (derivada de la tabla)

> **No es código**: es la especificación de la suite que Fase 5 debe escribir. El objetivo declarado es "un fallo de red debe producir `UNKNOWN` en el 100% de los casos" (ADR-002, verificación).

**Grupo A — cobertura exhaustiva de `fetchOutcome` (18 casos).**

Para **cada** uno de los 18 valores de `FetchOutcome`, con evidencia de contenido que por sí sola produciría `OPEN` (deadline futuro, base conocida, `sourceStatus = 'OPEN'`), el resultado debe ser:

| Assertion | Valor esperado |
|---|---|
| `status` | `UNKNOWN` en los 16 fallos; según §3.3 en los 2 de éxito |
| `preserveLastKnown` | `true` en los 16 fallos |
| `reason` | No vacío, no `undefined` |
| **Anti-assertion** | `status !== 'CLOSED'` — explícita, no implícita |

**Grupo B — cobertura exhaustiva de la ladder de éxito (12 casos).** Un caso por fila S-1…S-11, más un caso de `fetchOutcome = 'not_modified'` para S-7 (debe dar el mismo estado que `ok`).

**Grupo C — invariantes de contrato (8 casos).**

| # | Invariante | Assertion |
|---|---|---|
| C-1 | `UNKNOWN ⇒ reason no vacío` | Deriva del tipo; test de regresión si alguien hace `reason` opcional |
| C-2 | `CLOSED ⇒ evidence.sourceExplicitlySaysClosed` | **La más importante.** Es la prueba de que `CLOSED` no se puede obtener por otra vía |
| C-3 | `OPEN ⇒ evidence.sourceStatus = 'OPEN'` **o** (`deadline_at` futuro ∧ `publisher_stated`) | Prueba de que no hay `OPEN` desde una fecha futura |
| C-4 | `resolveStatus` no muta `evidence` | Congelar el objeto de entrada, comparar después |
| C-5 | `resolveStatus` es determinista | Llamar 100 veces con la misma evidencia (mismo `now` inyectado) → mismo resultado |
| C-6 | Sin fetch y sin contenido → `UNKNOWN`, nunca `CLOSED` | El caso vacío |
| C-7 | `preserveLastKnown = true` preserva el `last_known_status` previo | Test de integración, no de unidad: `resolveStatus` no muta la BD |
| C-8 | Ningún `fetchOutcome` de F-01…F-16 con `deadline_at` en el pasado produce `EXPIRED` ni `CLOSED` | Solo `UNKNOWN` |

**Grupo D — propiedades (fuzz).** Para 10.000 combinaciones aleatorias de evidencia × `fetchOutcome` (con `now` fijo), las propiedades que deben sostenerse sin excepción:

- `P1`: `status ≠ 'CLOSED'` salvo `sourceExplicitlySaysClosed = true`.
- `P2`: `status = 'UNKNOWN' ⇒ reason ≠ ''`.
- `P3`: `preserveLastKnown = true ⇒ last_known_status` no se escribe.
- `P4`: para los 16 `fetchOutcome` de fallo, `status = 'UNKNOWN'` **siempre**, sin importar la evidencia.
- `P5`: `confidence ∈ {'HIGH','MEDIUM','LOW'}`.
- `P6`: la función no lanza excepciones ante evidencia malformada (entradas `undefined` en todos los campos opcionales). **Un `resolveStatus` que lanza una excepción es un `resolveStatus` que el `catch` de un run convierte en `CLOSED` por defecto.**

`P6` merece énfasis: si `resolveStatus` lanza y el llamador tiene un `catch` genérico que pone `CLOSED` (o deja el valor anterior), se reintroduce exactamente el bug que D4 elimina. **El contrato es: `resolveStatus` no lanza; devuelve `UNKNOWN`.** Un test que le pasa basura y verifica que devuelve `UNKNOWN` es la defensa directa contra esa clase de defecto.

---

## 4. Deadline engine

### 4.1 Las cinco columnas y qué resuelve cada una

| Columna | Pregunta que responde | Por qué no se puede eliminar |
|---|---|---|
| `deadline_at` (timestamptz) | **¿Cuándo**, en tiempo absoluto e inequívoco? | Un instante con zona horaria es el único valor que permite ordenar y comparar sin ambigüedad. Es el valor que se **calcula** |
| `deadline_tz` | **¿En qué zona la declara la fuente?** | Permite mostrar "11:00 UTC según la fuente" al lado del horario local del lector. Sin él, el usuario ve una hora que no reconoce |
| `deadline_raw_text` | **¿Qué escribió exactamente el editor?** | Es la evidencia primaria. Un `deadline_at` calculado puede ser correcto y aun así sonar a que nunca lo dijo la fuente. El texto verbatim es lo que el usuario puede contrastar con la página oficial |
| `deadline_basis` | **¿Podemos calcular días restantes?** | `publisher_stated` → sí. `inferred_from_cycle` → el deadline es **nuestro estimate**, no un dato de la fuente. Mostrar "3 días" sobre un deadline inferido es inventar precisión. discovery §4.4: "nunca calcular días restantes desde un cutoff asumido" |
| `deadline_precision` | **¿Con qué granularidad lo dijo la fuente?** | Distingue "cierra el 6 de octubre a las 11:00" de "cierra el 6 de octubre". La diferencia es de hasta 24 horas y **ninguna de las dos se puede reducir a la otra** |

**Las cinco son necesarias porque responden a cinco preguntas distintas, y confundirlas es exactamente el error de ±1 día** que R6 describe y que U1 (`value-impact §3`) identificó como motivo de abandono. Se pueden eliminar dos (`deadline_tz`, `deadline_raw_text`) y las otras tres pasan a ser ambiguas; ese es el argumento.

### 4.2 Reglas de countdown: cuándo mostrar

Se muestra countdown **si y solo si se cumplen las seis condiciones**. La quinta y la sexta son las que se olvidan.

| # | Condición | Por qué |
|---|---|---|
| 1 | `internal_status ∈ {OPEN, UPCOMING}` | Un countdown sobre `CLOSED`, `EXPIRED`, `PAUSED` o `UNKNOWN` es ruido o daño. **`UNKNOWN` es el caso crítico**: discovery §4.4 lo prohíbe explícitamente. Lo implementa la vista (`countdown_label` a `NULL`, §1.17), no un `CHECK` que borraría el dato — ver H4 en §2.2 |
| 2 | `deadline_at IS NOT NULL` | — |
| 3 | `deadline_basis = 'publisher_stated'` | Sin base declarada por la fuente no hay countdown (discovery §4.4). `inferred_from_cycle` **también queda fuera**: es un estimate nuestro, no un dato de la fuente, y "3 días" sobre él sería precisión inventada |
| 4 | `deadline_precision ≠ 'UNKNOWN'` | DS-04: sin precisión declarada, no hay día confiable |
| 5 | `deadline_at > now()` | Un countdown negativo o "0 días" en una convocatoria abierta es el bug que U1 reporta como motivo de abandono. **Si ya pasó, no hay countdown** |
| 6 | `is_published AND is_demo = false AND deleted_at IS NULL` | — |

**Las condiciones 3, 4 y 5 son las que fallan en producción.** La 5 es la que se olvida: es trivial olvidar que un deadline pasado no debe mostrar "0 días" o "-2 días". Y es exactamente el caso que el brief menciona: *el error ±1 día se manifiesta como un "0 días" en algo que sigue abierto*.

### 4.3 Cómo se calculan los días restantes: qué zona cuenta y cuál no

Este es el punto donde la mayoría de las implementaciones se equivocan, y donde R6 dice que un error "causa daño directo y visible".

**La respuesta corta, que es contraintuitiva:** el conteo **nunca** se hace en la zona horaria del lector. La zona del lector se usa **solo para mostrar** la hora local equivalente; el número se calcula en la granularidad que la fuente declaró, y para fechas sin hora, en la zona donde vive la convocatoria.

**El error que hay que evitar.** Una implementación natural calcula:

```
días = (deadline_at.date() - today()).days
```

donde `deadline_at.date()` usa la zona horaria **de la sesión de la BD** (normalmente UTC) y `today()` la del servidor. Para una convocatoria de Chevening que cierra el 6 de octubre a las 11:00 UTC, y un lector en Bogotá (UTC−5):

- Instante real de cierre: **6 oct 06:00 hora de Bogotá**.
- Un lector en Bogotá abre la página el **5 oct a las 20:00**: le quedan **10 horas**.
- Con UTC: `deadline_at.date() = 6 oct`, `today() = 5 oct` (si el servidor aún es 5 oct en UTC) → **1 día**.
- Con la zona del servidor desfasada en unas horas, o si el cálculo se cachea a medianoche, puede dar **0 días**.

**0 días con 10 horas restantes** es un error que el usuario lee como "cerró" o "urge ahora", y es un mensaje que no podemos permitir en un producto cuyo claim es la verificabilidad.

**La regla correcta, en tres pasos:**

**Paso 1 — El instante es absoluto; no se toca.** `deadline_at` es `timestamptz`. La comparación con `now()` es una comparación de instantes, correcta por construcción sin importar la zona. Ningún cálculo de días debe tocar el instante.

**Paso 2 — La granularidad la fija `deadline_precision`, no la zona horaria.** El countdown no se calcula "en la zona del lector". Se calcula en la **granularidad que la fuente declaró**:

| `deadline_precision` | Conteo | Zona del conteo | Zona del lector | Ejemplo |
|---|---|---|---|---|
| `MINUTE` / `HOUR` | **Horas completas** hacia el instante. Nunca días completos | irrelevante: se cuenta sobre el instante absoluto | solo para **mostrar** la hora local equivalente | Chevening `6 oct 11:00 UTC` → "Cierra en **2 días 6 h**" |
| `DATE` | **Días naturales** hasta el fin del día del deadline | `deadline_tz` (la de la fuente) | solo para la etiqueta "hoy"/"mañana", que se compara contra `deadline_tz` | Erasmus `15/10/2026` → "Cierra mañana" / "Cierra en **3 días**" |
| `UNKNOWN` | **No hay countdown** (condición 4) | — | — | — |

**Paso 3 — Para `DATE`, el día se cuenta en la zona de la fuente, y se muestra el texto literal.** Cuando la fuente da una fecha sin hora, el día natural que importa es el día **en la zona donde la convocatoria vive**, porque es ahí donde el editor piensa cuando escribe "cierra el día 15". Contar en la zona del lector introduce un error de un día en la frontera: para un lector en Auckland (UTC+13) y una convocatoria europea que cierra el 15, el 15 ya es el 16 en Auckland.

**Paso 4 — La zona del lector se usa para una cosa: la etiqueta relativa.** "Cierra mañana" / "Cierra hoy" se decide comparando el día local del lector con el día del deadline **en `deadline_tz`**, no en la zona del lector. Si se compararan en zonas distintas, un lector de Auckland vería "mañana" el día que un lector de Lisboa ve "hoy" sobre la misma convocatoria: dos verdades incompatibles para un mismo dato. El número grande ("3 días") y la fecha absoluta son idénticos para todo el mundo; solo la etiqueta se adapta, y por eso se escribe en la zona del deadline.

**Por qué esto no contradice discovery §4.4.** El documento dice "Renderizar countdown solo si la base es conocida", "nunca calcular días restantes desde un cutoff asumido" y "nunca countdown en `UNKNOWN`". Las tres se cumplen: la base (`deadline_basis`) es `publisher_stated`, el estado no es `UNKNOWN`, y el cutoff de fin de día **no está asumido en silencio**: está registrado en `deadline_precision = 'DATE'`, en `deadline_tz`, y se le dice al usuario en el copy de §4.4. Lo prohibido es el cutoff invisible; ése es exactamente el que un `CHECK` no puede evitar y una nota visible sí.

**El formato de salida incluye siempre tres elementos**, sin excepción:

```
2 días 6 h · 6 oct 2026, 11:00 UTC (6:00 en Bogotá) · "6 October 2026, at 11:00 (UTC)"
```

En móvil de gama media (U1, 20 años, 20 minutos de sesión) el countdown es legible a la distancia porque usa `tabular-nums` (todos los caracteres con el mismo ancho, para que los dígitos no "bailen" al cambiar) y nunca la fuente principal para un dato numérico.

### 4.4 Deadline sin hora: el caso que decide si el producto es creíble

Es el caso más común y el que más daño hace, porque la mayoría de los portales escriben "Applications close: 15 October 2026" sin hora.

**El problema.** No es solo que falte la hora. Es que **"cierra el 15" es ambiguo en el momento de cierre**: ¿significa que a las 00:00 del 15 ya no se puede postular, o que durante todo el 15 se puede? Las dos lecturas son razonables y dan resultados distintos a las 23:00 del día 15.

**La regla de Fase 4 (conservadora por defecto, DS-05):**

| Aspecto | Decisión | Motivo |
|---|---|---|
| ¿Hay countdown? | **Sí**, en días naturales | El usuario necesita la señal. Sin ella, la función principal (J1) no funciona en la mayoría de registros |
| ¿Qué granularidad? | Días naturales completos hasta el **fin** del día 15 en `deadline_tz` | El punto más conservador: el último momento en que se puede postular es el final del día declarado |
| ¿Qué se muestra? | El día natural + el texto literal + **una nota explícita** | Honestidad: el usuario sabe que no es una hora exacta |
| ¿Qué se muestra a las 23:30 del 15? | **"Cierra hoy"**, no "0 días" | 0 días con 30 minutos restantes es el bug de R6 |
| ¿Qué se muestra al día 16? | **Nada.** Sin countdown | Condición 5. La convocatoria ya pasó; su estado depende de S-1/S-9 |

**El copy de la nota** (diseñada, no un placeholder, según discovery §9.4):

> *La fuente indica "15 de octubre de 2026" sin hora específica. Tomamos como cierre el final de ese día.*

Esto convierte una ambigüedad de la fuente en una **declaración explícita de nuestra regla**, con la fuente visible para que el usuario confirme. Es la diferencia entre un producto que adivina y uno que dice "esto es lo que sabemos y esto es lo que suponemos".

**Cuándo NO se muestra countdown** (además de las 6 condiciones de §4.2):

| Caso | Por qué |
|---|---|
| `deadline_at IS NULL` | No hay deadline. La UI muestra "Fecha límite: No publicada" |
| `deadline_basis = 'unknown'` | La fuente no dio un deadline; lo inventamos y lo marcamos como desconocido. Sin countdown |
| `deadline_basis = 'inferred_from_cycle'` | El deadline es **nuestro estimate** (extraído del ciclo anual del programa, no del texto de la convocatoria). "3 días" sobre un estimate nuestro es una afirmación que no podemos respaldar. **R6 es explícito: nunca countdown desde un cutoff asumido.** Un registro con deadline inferido muestra la fecha con un badge "Fecha estimada según el ciclo del programa", nunca un countdown |
| `deadline_precision = 'UNKNOWN'` | No sabemos si la fuente dio hora o solo fecha. Sin countdown |
| `internal_status = 'UNKNOWN'` | discovery §4.4, R7, y la condición 1 de §4.2 evaluada en la vista. **Este es el más importante.** Un countdown sobre un `UNKNOWN` es la peor combinación posible del producto: dice "3 días" sobre algo que no sabemos si está abierto |
| `deadline_at <= now()` | No hay countdown para nada pasado |

**El caso `inferred_from_cycle` merece énfasis porque es el que más fácilmente se implementaría mal.** Es tentador usar el ciclo anual del programa para llenar el hueco y mostrar "quedan 45 días". La tentación produce exactamente el daño que R3 describe: una afirmación de confianza sobre un dato inventado. **`inferred_from_cycle` existe en el esquema para que el dato exista sin que se muestre como si fuera un hecho de la fuente.** Se usa para ordenar, para agrupar, para detectar que un ciclo está por abrir — no para contar días al usuario.

### 4.5 Ejemplos reales (Chevening vs Erasmus)

Estos son los dos casos que el brief menciona, resueltos con las reglas de §4.3.

#### Ejemplo 1 — Chevening: "6 October 2026, at 11:00 (UTC)"

**Datos de la fuente** (observado en value-impact §1.2 F8, y legal-matrix §1a confirma el PDF de términos):
- `deadline_raw_text = "6 October 2026, at 11:00 (UTC)"`
- `deadline_at = 2026-10-06T11:00:00+00:00`
- `deadline_tz = "UTC"`
- `deadline_precision = "MINUTE"` (el editor declara hora y zona: precisión de minuto)
- `deadline_basis = "publisher_stated"`
- `opening_date = 2026-09-01` (ciclo de septiembre, observado)

**Lectura en Bogotá (UTC−5), 5 oct 2026 20:00 local:**
- Instante de cierre en hora local: **6 oct 06:00**.
- Diferencia con `now()`: **10 horas** → countdown: **"Cierra en 10 h"**.
- Absoluto: *6 oct 2026, 06:00 (tu hora) · 11:00 UTC según la fuente.*
- Raw visible: *"6 October 2026, at 11:00 (UTC)"*

**Lectura en Lagos (UTC+1), 6 oct 2026 09:00 local:**
- Instante de cierre local: **6 oct 12:00**.
- Diferencia: **3 horas** → **"Cierra en 3 h"**.
- Absoluto: *6 oct 2026, 12:00 (tu hora) · 11:00 UTC según la fuente.*

**Lectura en Lagos, 6 oct 2026 12:30 local (después del cierre):**
- `deadline_at < now()` → **sin countdown**. La regla de precedencia (§3.4) da S-9 → `EXPIRED` si la fuente no lo contradice, o `UNKNOWN` si el fetch falló.
- **Nunca "0 días" ni "-1 días".**

**Lo que este ejemplo demuestra:** con `precision = MINUTE`, el countdown es en **horas**, no en días. Un countdown en días habría dado "0 días" a las 09:00 de Lagos — que es exactamente el error de R6, y U1 lo habría leído como "cerró".

#### Ejemplo 2 — Erasmus+: "Application deadline: 15/10/2026" (fecha europea, sin hora)

**Datos de la fuente** (formato típico de un portal europeo, observado en legal-matrix §2b):
- `deadline_raw_text = "Application deadline: 15/10/2026"`
- `deadline_date_order = "DMY"` (ocho de octubre... no: 15 de octubre; ver §4.6)
- `deadline_at = 2026-10-15T23:59:59+01:00` (fin del día en `Europe/Brussels`, la zona del programa)
- `deadline_tz = "Europe/Brussels"`
- `deadline_precision = "DATE"`
- `deadline_basis = "publisher_stated"`

**Lectura en Bogotá, 14 oct 2026 10:00 local:**
- Días naturales hasta el fin del 15 en Bruselas: **2 días**.
- Countdown: **"Cierra en 2 días"**.
- Absoluto: *15 oct 2026 · según la fuente: "15/10/2026"*
- Nota: *"La fuente indica una fecha sin hora. Tomamos como cierre el final de ese día."*

**Lectura en Bogotá, 15 oct 2026 23:00 local (= 16 oct 04:00 en Bruselas):**
- El día 15 en Bruselas ya pasó. **Sin countdown.**

**Lo que este ejemplo demuestra:** la diferencia entre un deadline con hora (Chevening) y uno sin hora (Erasmus) **no es un detalle de formato**, es una diferencia en la granularidad de la afirmación. El countdown en días para Erasmus y en horas para Chevening no es inconsistencia: es el reconocimiento de que **la fuente föret en un caso y no en el otro**. Un producto que muestra "0 días" para ambos está tratando como equivalentes dos afirmaciones que no lo son.

#### Comparación lado a lado

| | Chevening | Erasmus+ |
|---|---|---|
| `deadline_raw_text` | `"6 October 2026, at 11:00 (UTC)"` | `"15/10/2026"` |
| `deadline_precision` | `MINUTE` | `DATE` |
| Granularidad del countdown | Horas | Días naturales |
| `deadline_at` | `2026-10-06T11:00:00Z` | `2026-10-15T23:59:59+01:00` |
| ¿Zona del lector afecta? | No (es un instante) | No (el día se cuenta en `Europe/Brussels`) |
| Nota de incertidumbre | No | Sí: "sin hora específica" |
| Riesgo de error ±1 | Bajo (hora declarada) | **Medio** (formato de fecha + zona + sin hora) — mitigado por `deadline_date_order` y `deadline_precision` |

### 4.6 Formato de fecha: la trampa del `05/10/2026`

Un caso que merece regla propia porque la ambigüedad es **irreducible** sin contexto externo.

`15/10/2026` es **15 de octubre** tanto en formato europeo (DMY) como en formato estadounidense (MDY): el primer componente, 15, no puede ser un mes. La ambigüedad solo aparece cuando **los dos primeros componentes son ≤ 12**. `05/10/2026` es **5 de octubre** en formato europeo y **10 de mayo** en formato estadounidense. `10/11/2026` es **10 de noviembre** en formato europeo y **11 de octubre** en formato estadounidense.

**La regla:**

1. Si la fuente da un formato **explícito** (palabras: "15 de octubre", "October 15", "15 October"), no hay ambigüedad. `deadline_date_order = NULL` (no aplica).
2. Si la fuente da formato **numérico** y el **primer componente es > 12**, no hay ambigüedad: es `DMY` (porque un mes no puede ser 15). `deadline_date_order = 'DMY'`.
3. Si el **primer componente es ≤ 12** y el **segundo es ≤ 12**, la ambigüedad es real. `deadline_date_order` se fija en `MDY` o `DMY` **solo si el adapter lo sabe por el contexto de la fuente** (la configuración del adapter, no una heurística por registro). Si no se sabe, `deadline_date_order = NULL` → el `CHECK deadline_ambiguous_date` (§2.3) impide que haya un `deadline_at` sin orden declarado → **el registro se queda sin deadline, con `needs_review = true`, y la UI muestra "Fecha límite ambigua en la fuente"**.

**El punto de fondo:** preferimos un registro sin deadline a un registro con el deadline equivocado por un mes. Un error de deadline cuesta una postulación (R3, incidente de confianza Sev-1). Un deadline ausente cuesta una línea de "No publicada" que el usuario puede resolver con un clic a la fuente — que es exactamente lo que el producto le pide que haga.

**Por qué `deadline_date_order` es una columna y no un parámetro del deadline engine:** porque es una decisión **por registro**, no por fuente. Una misma fuente puede tener un portal con formato europeo y un PDF con formato estadounidense. Y porque el dato es auditable: si un usuario nos disputa un deadline, podemos mostrarle el orden de lectura que usamos y por qué.

### 4.7 Reglas de presentación (lo que el motor no hace)

Estas reglas son de presentación, pero las declaro aquí porque la frontera entre motor y presentación es donde R6 se pierde en la implementación.

| Regla | Detalle |
|---|---|
| `tabular-nums` en toda cifra temporal | discovery §4.4. Sin esto, los dígitos cambian de ancho alActualizar y el número "baila", lo que en móvil se lee como inestabilidad |
| El countdown se muestra junto a la **fecha absoluta** | Nunca "3 días" a secas. La fecha absoluta es el dato comprobable |
| El `deadline_raw_text` se muestra **verbatim**, entre comillas | Es la evidencia de que no inventamos. Si el portal dice "October 6 at 11:00 (UTC)", mostramos eso, no "6 de octubre a las 11:00" (que ya es una traducción nuestra) |
| La zona horaria de la fuente se nombra explícitamente | "11:00 UTC según la fuente" vs. la hora local del lector. Un countdown sin zona es un countdown sin contexto |
| Un countdown **nunca** aparece en `UNKNOWN` | Reforzado por `CHECK` en DB (§2.2), no solo por la vista |
| Un countdown **nunca** aparece para un `is_demo` | `architecture §12` |

---

## 5. Deduplicación

### 5.1 El coste asimétrico, que dicta toda la estrategia

Antes de cualquier regla técnica:

| Error | Consecuencia | Frecuencia |
|---|---|---|
| **Fusionar dos becas distintas** | Un usuario postula a la beca equivocada. R3, incidente de confianza terminal. El usuario pierde una postulación y deja de confiar en la plataforma | Rara pero catastrófica |
| **No fusionar dos registros iguales** | Un registro duplicado. M6 sube. La tasa objetivo es ≤2% | Frecuente y tolerada |

**La asimetría es de al menos dos órdenes de magnitud.** Un error de fusión cuesta una postulación; un error de no-fusión cuesta una línea duplicada. **Toda la estrategia de dedupe se deriva de esa asimetría: ante la duda, dos registros.**

`discovery §2.2` ya lo decidió: "Dedupe automático fuzzy: riesgo de fusionar programas distintos; manual + exacto en MVP". Este documento lo operacionaliza.

### 5.2 Identidad fuerte: tres señales, y cómo se combinan

**Una señal no basta.** Cada una por sí sola es insuficiente:

| Señal | Por qué | Por qué no basta sola |
|---|---|---|
| **URL canónica** | La identidad más fuerte que existe: el mismo programa, la misma página | Dos programas legítimos pueden compartir página (una página de consorcio con 6 programas) y la misma página puede servir a dos ciclos |
| **Título normalizado** | Identifica el programa por su nombre | Títulos idénticos existen enADM universities diferentes. "Master in Public Health" en 40 universidades |
| **`external_id` de la fuente** | El identificador que **la propia fuente** da al programa | Solo EACEA lo tiene; la curación manual no |

**La regla de identidad fuerte es conjunción, no disyunción:**

> Dos registros son la **misma beca** si y solo si comparten **URL canónica** (host + path normalizados) **y** el título normalizado **coincide**, **y** — cuando ambos tienen `external_id` de la misma `source_id` — esos IDs **coinciden**.

**Por qué conjunción y no disyunción:** con disyunción, "mismo `external_id`" bastaría para fusionar. Pero un `external_id` mal leído, o un `external_id` que el adapter reasigna entre versiones del feed, fusionaría dos programas. La conjunción exige que **las tres señales coincidan**. Si solo coinciden dos, el caso es un duplicado **probable** (§5.4), no un duplicado confirmado.

**Normalización de la URL (canónica):**

```
fuente:  https://WWW.Master-Biopham.eu/?utm_source=rss#programas
canónica: master-biopham.eu/            ← host en minúsculas, sin www, sin query de tracking, sin fragment
```

Reglas: `https` y `http` se consideran equivalentes (mismo recurso); se eliminan parámetros de tracking (`utm_*`, `gclid`, `fbclid`, `ref`); se conserva el `path` con su capitalización original (**los paths pueden distinguir mayúsculas**); se elimina el fragmento. **No** se sigue un redirect para canonicalizar: eso sería una petición de red por registro, y el modelo de seguridad prohíbe que la capa de datos haga fetch.

**Normalización del título:**

```
"MASTER IN BIOPhAM – European Master"  →  "master biopharm european master"
  - minúsculas
  - acentos eliminados (unaccent)
  - puntuación → espacio
  - espacios colapsados
  -Keywords de ciclo eliminadas ("2026/2027", "2026-27")
```

La normalización es **deliberadamente conservadora**: solo elimina lo que es ruido puro (mayúsculas, acentos, puntuación, etiquetas de ciclo). **No** elimina palabras, **no** reordena, **no** aplica sinónimos. Un título que no coincide exactamente tras esta normalización **no es el mismo título**, y eso es una decisión, no una limitación.

### 5.3 Cuándo es duplicate, cuándo variante, cuándo distinto

Las tres categorías se distinguen por **qué cambia entre los dos registros**:

| Categoría | Qué coincide | Qué difiere | Acción |
|---|---|---|---|
| **Duplicado** | URL canónica **y** título normalizado **y** `external_id` (si ambos lo tienen) | Nada relevante. Puede haber diferencias menores en campos no críticos | Fusionar en un `duplicate_group_id` (§5.6) |
| **Variante** | Título normalizado **y** proveedor | **El ciclo**: `cycle_label`, `opening_date`, `deadline_at`, `source_url` | **NO fusionar.** Son la misma convocatoria en ciclos distintos, o dos convocatorias del mismo programa. Cada una tiene su fecha y su verificabilidad |
| **Distinto** | — | **Proveedor, universidad, nivel, país, o deadline** | **NO fusionar.** Son becas diferentes. Un mismo título con dos universidades distintas es el caso más común y el más peligroso de fusionar |

**El caso de la "variante" merece una advertencia específica.** Chevening 2026 y Chevening 2027 tienen (probablemente) el mismo título, el mismo proveedor, el mismo nivel. Si se fusionaran, el registro de 2026 mostraría el deadline de 2027, o viceversa. Un usuario vería "Cierra en 45 días" sobre una convocatoria de un ciclo que ya pasó. **La regla `cycle_label` (ADD-07) existe exactamente para esto**, y es una razón por la que el feed EACEA — que mezcla colecciones `Legacy` con las actuales — no puede simplemente tragar todo y deduplicar por título: necesita distinguir qué ciclo es cada entrada.

**La categoría "distinto" por nivel o país** usa un **guard de no-merge** que se aplica incluso si las otras señales coinciden:

> **Nunca fusionar dos registros que difieran en `provider`, `university`, `level`, `country_iso2`, o `deadline_at`.**

Esto es un veto, no una puntuación. Si el título coincide al 100% y la URL canónica coincide al 100%, pero los deadlines difieren, **no se fusionan**: van a `needs_review`. La razón es que una diferencia en cualquiera de esos cinco campos es exactamente la información que el usuario necesita, y un merge la destruiría.

### 5.4 `possible_duplicate_of` vs `duplicate_group_id` (DS-08)

Dos mecanismos con **semánticas distintas** y **consecuencias distintas**:

| | `duplicate_group_id` | `possible_duplicate_of` |
|---|---|---|
| Qué es | Un **hecho**: sabemos que son la misma beca | Una **señal**:parecen la misma beca |
| Quién lo establece | Curador humano, o coincidencia exacta de las tres señales | El pipeline, por heurística conservadora |
| Efecto en la publicación | El canónico se publica; el otro se marca no canónico (visible en la UI con "N registros fusionados") | **Ninguno.** Los dos se publican |
| Efecto en el usuario | Ve una ficha, con nota de transparencia | Ve dos fichas (molesto, no dañino) |
| Reversibilidad | Alta (se puede deshacer un grupo) | N/A (es una pista) |
| Costo del error | Alto: una beca real desaparece de los resultados | Bajo: un duplicado visible |

**Por qué dos mecanismos y no uno.** La razón es la asimetría de §5.1 aplicada a un nivel distinto. Un `possible_duplicate_of` se puede generar **automáticamente** con una heurística que produce falsos positivos a un coste bajo (el revisor lo descarta en 30 segundos). Un `duplicate_group_id` requiere **confirmación** porque su error es caro. Si hubiera un solo mecanismo, o tendríamos que automatizar el mecanismo caro (fuzzy merge (prohibido)), o el mecanismo barato no se usaría (porque no sería el default). Con dos, **el automatizado produce pistas y el humano produce hechos**.

**Las señales que disparan `possible_duplicate_of`** (todas conservadoras, ninguna suficiente para fusionar):

| Señal | Umbral | Falso positivo esperado |
|---|---|---|
| Mismo título normalizado **y** mismo proveedor | Exacto | Medio (títulos genéricos como "Master in Public Health"). Por eso es solo una señal |
| Mismo `external_id` en la misma `source_id` pero **URL canónica distinta** | Exacto | Bajo. Señal fuerte de que una de las dos es una URL antigua |
| Mismo proveedor **y** mismo nivel **y** mismo país **y** mismo `cycle_label` | Exacto | Alto (muchas becas del mismo tipo). Señal de ruido, para triage |
| Distancia de Levenshtein en título normalizado < 0.15 (casi idéntico) | Umbral | **No se usa en MVP.** Es la puerta al fuzzy matching; ver §5.7 |

**Ninguna de estas señales cambia el estado de publicación.** Todas crean una entrada en la cola de triage.

### 5.5 Política de merge: las cinco condiciones que bloquean un merge

Un merge **nunca** procede si se cumple cualquiera de estas:

| # | Condición de bloqueo | Por qué |
|---|---|---|
| 1 | Los `deadline_at` **difieren** (ambos no nulos, no iguales) | Es la información que J1 necesita. Un merge que la destruye causa un deadline incorrecto (R3) |
| 2 | Los `provider` o `university` **difieren** | Podrían ser becas distintas que comparten título |
| 3 | Los `country_iso2` o `level` **difieren** | Un master en México no es un master en España |
| 4 | Los `cycle_label` **difieren** | Ciclos distintos, plazos distintos (ver §5.3) |
| 5 | Alguno de los dos está `needs_review` | Un merge con un registro en revisión es fusionar con información que todavía no sabemos correcta |

**Y una sexta condición, de procedimiento:**

> **El merge es siempre una acción humana, registrada con `actor = 'curator'` en `audit_trail`.** No hay merge automático. La excepción es la fusión trivial dentro de la curation session del mismo curador.

**El merge en la práctica** (lo que hace el curador, no el sistema):

1. El curador ve dos fichas marcadas con `possible_duplicate_of`.
2. Abre ambas, compara **campo a campo** (la UI muestra el diff).
3. Decide: son la misma beca, o son distintas.
4. Si son la misma: crea un `duplicate_group`, marca uno como `is_canonical = true`, y el otro queda con `is_canonical = false`.
5. **El no canónico no se borra.** Se queda en la base con `is_published` siguiendo la regla del grupo (o se marca como fusionado en la UI). El `CHECK delete_requires_reason` impide que se elimine sin rastro.
6. Todo queda en `audit_trail` con `actor = 'curator'`.

**Por qué el no canónico no se borra, y por qué no se despublica automáticamente:** el cálculo de M6 (`records in a duplicate_group_id with >1 member ÷ published`) necesita que ambos existan. Si el no canónico se despublica al fusionar, el numerador de M6 baja, la métrica miente, y el usuario podría perder una beca real. **El registro se marca, no se elimina.**

### 5.6 Estructura de datos del grupo

```
duplicate_groups (id, reason, created_by, created_at)
    └── duplicate_members (duplicate_group_id, scholarship_id, is_canonical)
```

- `one_canonical_per_group` (CHECK único, `architecture §7.2`): un grupo tiene **exactamente un** canónico.
- `one_group_per_scholarship` (UNIQUE en `scholarship_id`): un registro está en **un** grupo como máximo.
- `is_canonical` es el que se muestra. El canónico se publica; el resto se marca como variante en la UI.
- `reason` en el grupo (`exact_url` | `exact_external_id` | `curator_confirmed`) documenta **cómo** se decidió el merge, para que un revisor posterior pueda auditarlo.

**La semántica de `is_canonical` y su relación con la publicación.** Un `duplicate_members` con `is_canonical = false` **no desaparece de los resultados**: aparece en la ficha del canónico como "N registros equivalentes fusionados" (transparencia, M6 expuesto como estadística, discovery §7). **No se oculta información; se agrega con honestidad.** Un usuario que busca esa beca ve una ficha clara, no dos duplicados ni un vacío.

### 5.7 Por qué no fuzzy matching automático en MVP (DS-09)

Cuatro razones, de la más fuerte a la más débil.

**1. La asimetría de coste (§5.1) hace que el caso favorable no exista.** El beneficio de un merge correcto es eliminar una fila duplicada. El coste de un merge incorrecto es que un usuario postule a una beca equivocada. Con un corpus de ~300 registros, M6 objetivo es ≤2% — **6 registros duplicados como máximo**. El máximo beneficio posible de un merge perfecto es 6 filas. El coste de un merge erróneo, incluso con probabilidad del 1%, es un usuario que postula a la beca equivocada. **La relación riesgo/beneficio no cierra.**

**2. Los títulos de becas son estructuralmente ambiguos.** "Erasmus Mundus Joint Master in Renewable Energy" y "Erasmus Mundus Joint Master in Sustainable Energy" tienen distancia de edición mínima. Un master en Renewable Energy y uno en Sustainable Energy, ambos Erasmus Mundus, son becas **distintas** con títulos casi idénticos. Un umbral de similitud que los separa, los separa de cualquier otra pareja cercana. Cualquier umbral que no los fusione, tampoco fusionará los duplicados más evidentes.

**3. El feed EACEA **mezcla** deliberadamente** colecciones `Legacy` con las actuales** (verificado en `legal-matrix §2b`). Un título idéntico puede aparecer en la colección actual (vigente) y en `Legacy` (vencido), con las **mismas** universities pero fechas distintas. Un fuzzy match los fusionaría y el usuario vería el deadline de un programa vencido junto al de uno vigente. **Es el peor resultado posible para J1.** La distinción correcta es `cycle_label` (§5.3), no similitud de título.

**4. No hay forma de validar el fuzzy sin un corpus etiquetado.** Un umbral de similitud se ajusta con datos: "estas 50 parejas son duplicados, estas 50 no". No tenemos ese set, y construirlo requiere más esfuerzo del que ahorra. `discovery §2.2` ya lo descartó.

**Qué haría cambiar la decisión.** La condición de re-evaluación (escrita, medible, como el gate de §3.2):

> Si (a) M6 supera el 2% durante **dos ciclos consecutivos** de curateo, **y** (b) el volumen de registros supera 2.000, **y** (c) el volumen de Registers duplicados confirmed supera 50, entonces fuzzy matching se reevalúa — con la condición dura de que **cualquier merge por fuzzy requiere confirmación humana** antes de aplicarse.

Es decir: fuzzy puede **señalar**, nunca **fusionar** (§5.4). Ni siquiera post-MVP, el merge automático es un riesgo que no se acepta en un producto cuyo claim es la verificabilidad.

---

## 6. Provenance y audit

### 6.1 Qué es la provenance y por qué es el producto

`discovery §3.1.2` y value-impact §1.1: el valor no es *descubrir*, es **verificar**. Y verificar requiere poder responder, para **cualquier campo visible**, la pregunta: **"¿de dónde sale esto?"**

`security §6.1` lo dice con precisión: "Provenance **por campo** donde sea factible: no para texto masivo, pero definitivamente para **status, deadline, amount, eligibility, official link**".

**Los cinco campos queQueenestrian tienen provenance obligatoria** (y por qué cada uno):

| Campo | Sin provenance, el usuario no puede | Con provenance, el usuario puede |
|---|---|---|
| `internal_status` | Distinguir "la fuente dice que está abierta" de "lo dijimos nosotros porque el deadline no pasó" | Ver la diferencia entre S-4 (fuente explícita) y S-7 (deadline vigente) |
| `deadline_at` | Saber si un día es del editor o es un estimate nuestro | Confiar en el countdown, o descartar el registro si es `inferred_from_cycle` |
| `amount` | Saber si el monto es de la convocatoria o del catálogo | Decidir si la cifra es accionable |
| `source_url` | Saber si el enlace es a la fuente oficial o a un agregador | Cumplir la promesa de source-of-truth (§5.3 discovery) |
| `opening_date` | Saber cuándo empieza el ciclo | Planificar la postulación con antelación |

**Los campos que NO tienen provenance** (y por qué está bien): `title` (el título es el título, de donde venga es secundario), `fields[]`, `coverage[]` (listas de taxonomía nuestra, no afirmaciones de la fuente), `modality` (clasificación nuestra, derivada). La provenance de estos campos es "nuestra clasificación", que no requiere path de fuente. **La regla: provenance para lo que la fuente *afirma*, no para lo que nosotros *clasificamos*.**

### 6.2 `field_provenance`: el registro de origen

Una fila de `field_provenance` responde: **para el campo X de la beca Y, la fuente Z, en la URL W, en el path del feed V, en el run R, el lee T, lo puso M.** (M = método: `auto` o `curator`.)

**La escritura es un UPSERT** sobre `(scholarship_id, field_name)`, y ocurre en la **misma transacción** que escribe el campo en `scholarships` (`architecture §4.4`, PERSIST). Si la transacción falla, no queda un campo sin su procedencia. Si tiene éxito, no puede quedar una procedencia sin su campo.

**Por qué UPSERT y no append.** `field_provenance` responde a "¿de dónde sale **el valor actual**?". El histórico de cómo llegamos aquí es `audit_trail` (§6.3). Si `field_provenance` fuera append-only, habría que consultar "la última fila de este campo" en cada lectura, y cada lectura de provenance sería una subconsulta de orden. Con UPSERT, la fila vigente es un `SELECT` directo por índice único.

**`source_field_path` y el caso manual.** En el feed EACEA, `source_field_path` es un XPath como `//item[3]/link` o `//item/category[@domain='ECTS Duration']`. En curación manual, `source_field_path` es `NULL` y `method = 'curator'`, con `curator = 'iniciales/ID'` y `source_url` = la página que el curador abrió. **La misma tabla cubre ambos casos.** Esto es lo que hace que DS-01 (no partir el corpus en tablas curadas/automatizadas) sea implementable sin campos paralelos.

**El CHECK de la lista blanca de campos.** `field_name` solo puede ser un campo de negocio. Esto no es burocracia: garantiza que no se está siguiendo la procedencia de un campo interno (como `needs_review`) que no debería estar expuesto, y que el join con `scholarships` en un informe de provenance no produce surprises.

### 6.3 `content_hash` + `version` + snapshot: versionado de contenido

Tres mecanismos, con roles distintos:

| Mecanismo | Pregunta que responde | Granularidad |
|---|---|---|
| `content_hash` | **¿Ha cambiado algo?** | Registro completo (subconjunto de campos) |
| `version` | **¿Cuál es la iteración actual?** | Entero monótono |
| `record_versions` (snapshot) | **¿Cómo era antes?** | Estado completo de una versión |

**`content_hash` se calcula sobre un subconjunto de campos, no sobre la fila entera.** La razón es práctica y de integridad: si `content_hash` incluyera `last_seen_at` o `last_verified_at`, **cambiaría en cada run**, porque esos campos cambian en cada fetch exitoso. Un hash que cambia en cada run no puede usarse para detectar "cambió algo relevante". El hash cubre **solo los campos que el usuario lee como afirmaciones de la beca**:

```
content_hash = sha256(
  title | provider | university | country_iso2 | destination_countries | level |
  fields | modality | funding_type | amount | currency | coverage |
  official_url | application_url | source_url |
  source_status | internal_status | deadline_at | deadline_basis | deadline_precision |
  opening_date | cycle_label | duration_months | ects
)
```

Campos **excluidos** deliberadamente: `last_verified_at`, `last_seen_at`, `source_last_updated_at`, `version`, `content_hash` mismo, `status_reason`, `status_confidence`, `last_known_status`, `notes_internal`, `needs_review`, `is_published`, `deleted_at`, `delete_reason`, `curated_at`, `is_demo`. Estos cambian sin que cambie la afirmación al usuario, o son metadatos operativos.

**Consecuencia:** un run que re-verifica la misma beca sin cambios de contenido produce el **mismo** `content_hash`, y por tanto **no escribe un `record_versions`**. Solo un cambio real de contenido genera una versión. Esto mantiene `record_versions` pequeño y significativo.

**La protección contra concurrentes (AR-6) usa `version` como compare-and-swap:**

```
-- pseudo-TS: la escritura guarded de scholarships
-- Solo un writer puede tomar el registro; el segundo ve version distinta y no pisa.
-- La pérdida de la carrera se registra como needs_review, nunca se resuelve con "último gana".
```

**Por qué no "último gana":** si dos runs leen la misma versión y ambos escriben, el segundo pisa al primero. Con un feed delta que mezcla colecciones y una curación manual concurrente, "último gana" produce un registro cuyo estado es una mezcla de dos observaciones que nunca ocurrieron juntas. El `CHECK` de `version` y el CAS hace que el conflicto sea **visible** (queda en `needs_review` con el diff) en vez de silencioso.

**`record_versions` se poda por antigüedad, no por conteo.** A diferencia de `audit_trail` (que se conserva completo como evidencia forense), los snapshots se pueden podar a los **90 días más un máximo de 20 versiones por registro** (más allá de eso, se conserva solo la más antigua y la actual). Esto es coherente con la política de retención de `security §8`: los payloads son grandes, el audit trail (que es pequeño) es la evidencia que importa.

### 6.4 `audit_trail`: append-only, campo a campo

Cada cambio a un campo de una beca escribe una fila: `(field, old_value, new_value, source_id, run_id, actor)`. El trigger `block_mutation` (§2.7) **rechaza `UPDATE` y `DELETE`** sobre la tabla.

**Por qué `audit_trail` es distinto de `status_history`.** `status_history` (§1.9) registra **transiciones de estado** (de OPEN a UNKNOWN, con razón y confianza). `audit_trail` registra **cambios de campo** (el deadline pasó de X a Y, el campo `amount` pasó de 5.000 a 6.000). Son cosas distintas:

| | `status_history` | `audit_trail` |
|---|---|---|
| Unitario | Una transición de estado | Un cambio de un campo |
| Para qué | "Cómo ha evolucionado el estado de esta beca" | "Quién cambió qué, cuándo" |
| Quién lo lee | La UI (ficha), las métricas (M5) | La investigación forense, el descargo legal |
| Append-only | Sí | Sí |

Una transición de estado **siempre** produce también las entradas correspondientes en `audit_trail` (porque cambiar `internal_status` **es** cambiar un campo). La relación es de uno-a-muchos, no de uno-a-uno.

**El formato de `old_value` y `new_value` es `text`, no el tipo original.** Es deliberado: es un registro forense, no una columna consultable para cálculos. Un `amount` que pasó de `5000.00` a `NULL` se registra como `'5000.00'` → `NULL`. La pérdida de tipo es aceptable a cambio de que el trail sea un registro universal.

**El acceso al `audit_trail` esappend-only en DB y append-only en permisos:** `app_readonly` no tiene ningún privilegio sobre la tabla (§2.10). Nadie, salvo una auditoría explícita con permiso elevado, puede leerlo; y **nadie** puede escribir en él excepto el pipeline, mediante el procedimiento de append.

### 6.5 Por qué `status_history` es append-only y qué garantiza

Es la pregunta que el brief plantea explícitamente, y tiene una respuesta que va más allá de "para no perder datos".

**Un estado puede ser corregido. Un historial de estados no se corrige, se amplía.** Cuando descubrimos que una beca que creíamos `OPEN` estaba `CLOSED` desde hace semanas (un `data poisoning` leve, un error de curación), la corrección correcta **no** es reescribir el `status_history` para que parezca que lo supimos desde el principio. La corrección es **insertar una nueva fila** que documente: "en la fecha X descubrimos que el estado anterior OPEN era incorrecto; el estado real es CLOSED; la razón es [tal]". Esto es lo que `legal-matrix §11` llama "being wrong in public, honestly": **publicamos correcciones cuando nos equivocamos**.

**Lo que `status_history` append-only garantiza, concretamente:**

1. **Reproducibilidad de lo que el usuario vio.** "El 3 de marzo le dijimos a este usuario que la beca estaba abierta. Hoy no se lo decimos." Eso es un hecho, verificable, porque el historial es inmutable.
2. **Detección de anomalías (AR-7).** Un `status_history` append-only hace trivial la query de detección: "más de N transiciones a `CLOSED` en un mismo run_id". Un historial mutable se podría haber "limpiado" y la señal se perdería.
3. **Que `last_known_status` nunca miente.** `last_known_status` es una proyección del último estado con evidencia. Si el historial es append-only, esa proyección es auditable contra la fuente de verdad.
4. **La auditoría legal (CC BY, OGL).** Las licencias que nos aplican (OGL v3.0, CC BY 4.0) exigen **indicar los cambios** que hacemos a la información pública. Un historial inmutable de qué cambiamos y cuándo es la forma más limpia de cumplir eso sin depender de la memoria.
5. **Que la función pura de estado tiene consecuencias reales y trazables.** `resolveStatus` es una función pura (D4), pero sus salidas se persisten. El `status_history` es el puente entre la lógica pura y el mundo real: cada vez que la función devuelve un estado, hay una fila que lo registra. Si la función se cambiara en el futuro, el historial pasada **demuestra** cómo se calculó cada estado pasado.

**La garantía de integridad a nivel de DB (no solo de convención):**

- El trigger `block_mutation` rechaza `UPDATE`/`DELETE` sobre `status_history`.
- `status_history.scholarship_id` tiene FK con `ON DELETE RESTRICT`: **no se puede borrar físicamente una beca que tiene historial de estado.** La única forma de "eliminar" una beca es `deleted_at` (soft delete), que deja el historial intacto. Esto es coherente con "sin borrados silenciosos" (`security §6.1`).
- `status_history.to_status` y `from_status` tienen el mismo CHECK de enum que `scholarships.internal_status`: no se puede registrar un estado que no sea uno de los seis.

**El flujo de escritura de un cambio de estado (pseudo-SQL del pipeline, no implementación):**

```
-- pseudo-SQL, dentro de UNA transacción (architecture §4.4 PERSIST)
BEGIN;
  -- 1. leer el estado anterior
  SELECT internal_status, version FROM scholarships WHERE id = :id FOR UPDATE;  -- lock pesimista evita carrera

  -- 2. calcular el nuevo estado con la función PURA
  --    (resolveStatus(evidence) → status, confidence, reason, preserveLastKnown)

  -- 3. escribir el estado, con CAS sobre version
  UPDATE scholarships
     SET internal_status = :new_status,
         status_confidence = :confidence,
         status_reason = :reason,
         last_known_status = CASE WHEN :preserveLastKnown THEN last_known_status ELSE :new_status END,
         last_known_status_at = CASE WHEN :preserveLastKnown THEN last_known_status_at ELSE :now END,
         version = version + 1
   WHERE id = :id AND version = :old_version;

  -- 4. si el estado cambió, registrar en status_history (append-only)
  --    y en audit_trail (append-only), y en record_versions si cambió el content_hash
  -- (los detalles de §6.3)
COMMIT;
```

**El paso 3 con `WHERE version = :old_version` es el compare-and-swap** que detecta la carrera (AR-6): si `UPDATE` afecta a 0 filas, otro writer ya escribió, y el pipeline lo registra como `needs_review` con el diff, sin sobrescribir.

### 6.6 Resumen de garantías de integridad

| # | Garantía | Mecanismo | Capa |
|---|---|---|---|
| 1 | Nada se publica sin fuente + verificación + licencia | `CHECK publish_requires_provenance` | 🔒 DB |
| 2 | `UNKNOWN` siempre tiene motivo | `CHECK unknown_requires_reason` + tipo TS | 🔒 DB + código |
| 3 | Un fallo nunca produce `CLOSED`/`OPEN` | `resolveStatus` cortocircuita en `fetchOutcome` + tests | Función pura |
| 4 | Todo campo publicado tiene provenance | `field_provenance` UNIQUE + escritura en la misma txn | Código + DB |
| 5 | Todo cambio de estado deja rastro | `status_history` append-only + trigger | 🔒 DB |
| 6 | Todo cambio de campo deja rastro | `audit_trail` append-only + trigger | 🔒 DB |
| 7 | `status_history` sobrevive al registro | FK `ON DELETE RESTRICT` | 🔒 DB |
| 8 | `is_demo` inmutable | Trigger | 🔒 DB |
| 9 | No se borra nada sin razón | `CHECK delete_requires_reason` | 🔒 DB |
| 10 | Campos internos no salen del servidor | `REVOKE` por columna + vista única | 🔒 DB |
| 11 | Solo se fusionan becas idénticas | `possible_duplicate_of` ≠ `duplicate_group_id`; merge humano | Código + DB |
| 12 | Countdown solo con base y precisión | 5 CHECK de deadline | 🔒 DB |

---

## 7. Rendimiento y query patterns

### 7.1 Las cinco queries más frecuentes, con sus índices

Cada query se acompaña del índice que la sirve. Si una query no tiene índice, se documenta por qué no lo necesita.

#### Q1 — Búsqueda (full-text + filtros + orden por deadline)

La query central del producto (search-first, D1). Cada resultado la ejecuta.

```sql
-- pseudo-SQL. La query va contra la VISTA, no contra la tabla (§2.10):
-- la vista ya incorpora is_demo = false, deleted_at IS NULL y el allowlist de columnas,
-- así que ningún filtro de seguridad depende de que esta query lo recuerde.
SELECT id, slug, title, provider, country_iso2, level, fields,
       funding_type, amount, currency, internal_status, status_confidence,
       deadline_at, deadline_basis, deadline_precision, deadline_tz,
       countdown_raw,                       -- NULL salvo que se cumplan las 6 de §4.2
       source_name, source_url, source_licence, last_verified_at, is_demo
  FROM v_scholarships_public
 WHERE search_vector @@ websearch_to_tsquery('spanish', :q)   -- §0.2: :q ya normalizada
   AND (:level IS NULL OR level = :level)
   AND (:country IS NULL OR country_iso2 = ANY(:countries))
   AND (:funding IS NULL OR funding_type = :funding)
   AND (:deadline_from IS NULL OR deadline_at >= :deadline_from)
   AND (:deadline_to   IS NULL OR deadline_at <= :deadline_to)
   AND (:status IS NULL OR internal_status = ANY(:statuses))
 ORDER BY ts_rank(search_vector, websearch_to_tsquery('spanish', :q)) DESC,
          deadline_at ASC NULLS LAST
 LIMIT :limit OFFSET :offset;   -- limit default 20, max 100 (security §5.1)
```

> La vista **no expone `search_vector`** en su allowlist (`security §10.6` lo excluye). En producción el `@@` y el `ts_rank` se resuelven sobre la tabla dentro de una función de solo lectura, o la vista añade una columna calculada `search_rank`; **no** se resuelve exponiendo `search_vector` al cliente HTTP. Detalle de implementación de Fase 5.

**Índices que la sirven:** `scholarships_fts` (GIN sobre `search_vector`) para el `@@`; `scholarships_public_listing` (btree parcial `internal_status, deadline_at`) para el filtro de estado + `ORDER BY deadline_at`; los btree de faceta (`scholarships_by_level`, `_by_country`, `_by_funding`) para los filtros de igualdad.

**Por qué el `ORDER BY` no usa el índice para el ranking.** Con una consulta de texto, Postgres casi siempre elige el GIN para filtrar y después ordena en memoria. El btree parcial de `deadline_at` cubre el caso "sin texto, filtrar por estado y ordenar por fecha", que es la Q3. **No se intenta forzar un índice que sirva las dos cosas**: un índice compuesto `(search_vector, deadline_at)` sobre GIN no ordena por rango, y un btree con `ts_rank` no es determinable por el planner. A este volumen, el `LIMIT` después de ordenar en memoria es correcto; se revisa con `EXPLAIN` en Q5.

**Nota sobre el filtro `is_demo = false`:** es **obligatorio** en toda query pública (`architecture §12`: "nunca se olvida el filtro"). Aquí está explícito. La versión de producción usa la vista `v_scholarships_public`, que ya lo incorpora (§2.10), de modo que el filtro no se pueda olvidar.

**Por qué `websearch_to_tsquery` y no `to_tsquery`:** `websearch_to_tsquery` acepta sintaxis de búsqueda "de usuario" (comillas para frases, `-` para exclusión) **sin lanzar error de parseo**: una query mal formada devuelve cero resultados. `to_tsquery` lanza excepción, y una excepción por un asterisco que alguien escribió en el buscador es un error 500 en la cara del usuario y una entrada de log de nivel `error` que desplaza una alerta que ya está tonificada. Un buscador que degrada en silencio (0 resultados) es preferible a uno que rompe.

#### Q2 — Detalle de beca por `slug` (la página de resultado)

La segunda query más ejecutada: una por visita a `/es/scholarship/<slug>`.

```sql
-- pseudo-SQL
SELECT *
  FROM v_scholarships_public
 WHERE slug = :slug;          -- UNIQUE (§1.4.a) ⇒ como máximo una fila
```

**No necesita índice propio.** `slug` es `UNIQUE`, y el índice que crea esa restricción es un btree que resuelve la igualdad en una lectura. Crear además un índice parcial `WHERE is_published` sería redundante: los registros no publicados no son consultables por esta vía, pero un `SELECT` sobre la vista que los excluye nunca llega a ellos, así que el índice único ya cumple.

**Qué se añade a la fila en esta query y no en Q1:** `application_url`, `deadline_raw_text`, `official_url`, `legal_clearance`→no, `status_reason` completo, `cycle_label`. La vista los proyecta siempre (§2.10); lo que cambia es el mapper de la capa de presentación, que en la ficha completa muestra el verbatim del deadline y el motivo del estado. **La misma vista, dos mappers** — no dos endpoints con dos select distintos, que es donde aparecen las divergencias de campos.

#### Q3 — Ventana de deadlines: "cierra pronto" y coropleta

La query que alimenta la Homepage y la coropleta. Es la que **no tiene paginación** y por tanto la que más filas toca.

```sql
-- pseudo-SQL: registro en estado de acción Y deadline utilizable
SELECT id, slug, title, provider, country_iso2, deadline_at,
       deadline_basis, deadline_precision, deadline_tz, countdown_raw
  FROM v_scholarships_public
 WHERE internal_status IN ('OPEN','UPCOMING')
   AND deadline_at IS NOT NULL
   AND deadline_basis = 'publisher_stated'
   AND deadline_precision <> 'UNKNOWN'
   AND deadline_at > now()
   AND (:window_days IS NULL OR deadline_at <= now() + (:window_days * interval '1 day'))
 ORDER BY deadline_at ASC
 LIMIT 100;    -- tope duro: la vista pública nunca devuelve el corpus entero
```

**Por qué el filtro de countdown va aquí además de estar en la vista.** Duplicarlo en la query no es duplicación gratuita: es la defensa contra el caso en que un read-model futuro lea la tabla directamente. El coste es que la condición puede quedar desincronizada de la de la vista, y por eso **el test de §12 compara el conjunto de filas de esta query con el de la vista** y falla si divergen. Una condición duplicada sin test es una bomba; con test es una red.

**Índice que la sirve:** `scholarships_open_by_deadline` (btree parcial sobre `deadline_at`, restringido a `is_published AND is_demo = false AND internal_status IN ('OPEN','UPCOMING')`). Es un índice **parcial deliberadamente estrecho**: cubre exactamente el predicado de esta query y por eso cabe entero en pocas páginas, cosa que un btree completo sobre `deadline_at` con 300 filas y 250 publicadas no lograría por poco.

**El `LIMIT 100` es una decisión de diseño, no un recorte técnico.** Con 300 registros, la ventana completa cabe; el tope existe porque la vista **no debe poder enumerar el corpus**. Si mañana hay 5.000 y la ventana por defecto es "todo", la API se convierte en un endpoint de scraping. El tope va en la vista, no en el cliente.

#### Q4 — Cola de freshness y reverificación (P0–P3)

```sql
-- pseudo-SQL: qué hay que volver a verificar, y en qué orden
SELECT r.id, r.slug, r.source_id, r.last_verified_at, r.age,
       r.freshness_window_days, src.health_status
  FROM v_records_needing_reverification r          -- §1.17 (DS-07)
  JOIN sources src ON src.id = r.source_id
 ORDER BY CASE r.freshness_window_days
            WHEN 7  THEN 0     -- P0: ventana de verificación corta (deadline inminente)
            WHEN 14 THEN 1     -- P1
            WHEN 30 THEN 2     -- P2
            ELSE 3             -- P3: el resto
          END,
          r.last_verified_at ASC
 LIMIT :batch;   -- el budget del run decide, no la query (§3.6 F-16)
```

**El orden por prioridad, no solo por antigüedad.** `freshness_window_days` es política **de la fuente**: EACEA publica con frecuencia y sus deadlines se mueven; una convocatoria de universidad que actualiza dos veces al año no necesita re-verificarse cada semana. Ordenar solo por `last_verified_at` haría que el presupuesto del run se lo gastara una fuente sana y ruidosa mientras una convocatoria de deadline inminente se queda sin verificar. **La cola se ordena por riesgo**, no por antigüedad.

**Índice:** `scholarships_stale` (btree parcial sobre `last_verified_at`) para el rango, y `scholarships_by_source_freshness` para el corte por fuente de M4. El `ORDER BY CASE` no usa índice: son 300 filas y una cola; se calcula en memoria.

#### Q5 — Métricas de metodología (M3, M5, M6, M7)

La query de la página "CómoEnumerable funciona esta web". **No es una query de producto: es una query de confianza**, y por eso tiene reglas propias.

```sql
-- pseudo-SQL
WITH public AS (SELECT * FROM v_scholarships_public)   -- excluye is_demo por construcción
SELECT
  (SELECT count(*) FROM public)                                              AS total_publico,
  (SELECT count(*) FROM public WHERE internal_status = 'OPEN')              AS abiertas,
  (SELECT count(*) FROM public WHERE internal_status = 'UNKNOWN')           AS estado_desconocido,
  -- M6: duplicados confirmados sobre el corpus público
  (SELECT count(DISTINCT dm.scholarship_id)
     FROM duplicate_members dm JOIN public p ON p.id = dm.scholarship_id)   AS en_grupo_dup,
  -- M3: ningún registro público sin fuente verificable
  (SELECT count(*) FROM public
    WHERE source_url IS NULL OR source_licence IS NULL OR last_verified_at IS NULL) AS sin_procedencia,
  -- cobertura de verificación: qué fracción del corpus está fresca
  (SELECT count(*) FILTER (WHERE last_verified_at > now() - interval '30 days')::numeric
     / NULLIF(count(*),0) FROM public)                                      AS pct_fresca_30d
  ;
```

**Las reglas que esta query tiene que respetar, y que son la mitad del valor de la página:**

| Regla | Por qué |
|---|---|
| Nombra siempre el **denominador** | "80% verificado" sin decir "de 240" es un número publicitario. Con 300 registros, cada punto porcentual son 3 becas: el usuario tiene que poder hacer la división |
| **Excluye `is_demo`** siempre, también en el numerador | Un corpus de 5 registros demo cambiaría todos los porcentajes. La vista lo hace por construcción; si algún día alguien cuenta sobre la tabla, este bloque es la revisión |
| Publica también el **estado `UNKNOWN`** | Un sitio que solo muestra "240 abiertas" y esconde "60 sin verificar" está eligiendo qué se ve. `discovery §9.4` y R3 piden lo contrario |
| **No es un endpoint público deprecable** | Si estas cifras se mueven y nadie explica por qué, R3 se activa. Cada variación grande se explica en `audit_trail` |

**Índice:** ninguno específico. Son cinco `count` sobre 300 filas en una vista sin duplicados; el planner resuelve en una lectura secuencial de la vista, que a este volumen es más barata que mantener cinco índices parciales. **Se documenta la ausencia de índice como decisión**, no como olvido: es la primera query que se reevaluaría si el corpus creciera dos órdenes de magnitud.

### 7.2 Queries de operación (colas internas, no superficie pública)

Estas no pasan por `app_readonly`. Las sirve el rol de curador/admin, y por eso **no** heredan el allowlist de §2.10: necesitan ver `notes_internal`, `legal_clearance`, `curator` y `discovered_via` para hacer su trabajo.

```sql
-- OQ-1: cola de duplicados señalizados (DS-08). Automático propone, humano confirma.
SELECT s.id, s.slug, s.title, s.provider, s.cycle_label,
       a.slug AS posible_slug, a.title AS posible_title,
       a.source_url AS posible_source_url,
       s.source_url AS source_url,
       (s.external_id IS NOT NULL AND s.external_id = a.external_id) AS mismo_external_id
  FROM scholarships s
  JOIN scholarships a ON a.id = s.possible_duplicate_of
 WHERE s.possible_duplicate_of IS NOT NULL
   AND s.duplicate_group_id IS NULL          -- aún no confirmado: es una cola, no un grupo
   AND s.deleted_at IS NULL
 ORDER BY s.first_seen_at DESC
 LIMIT 50;
```

`mismo_external_id` es la columna que decide en 5 segundos: si es `true`, es el mismo programa y el revisor confirma el merge sin leer nada. Si es `false`, hay que comparar `source_url` y `cycle_label` (§5.5). **La query está diseñada para que el caso fácil no requiera leer** — es lo que hace viable la curación manual (§9).

```sql
-- OQ-2: cola de needs_review priorizada por motivo, no por fecha.
SELECT needs_review_reason, count(*) AS n, min(last_verified_at) AS mas_viejo
  FROM scholarships
 WHERE needs_review AND NOT is_published
 GROUP BY needs_review_reason
 ORDER BY n DESC;
```

**Se agrupa por motivo, no se lista por fecha.** `needs_review` sin `needs_review_reason` sería un bool (§2.2 lo prohíbe); con motivo, la pregunta de la cola es "¿cuál de estos cuatro problemas sistémicos estoy teniendo?", y eso se responde con un `GROUP BY` de diez filas en lugar de quinientas. Los motivos se emiten desde `validation_violations` (§1.13) y desde `resolveStatus()` (§3), de modo que el motivo es siempre un valor de catálogo cerrado, no texto libre.

### 7.3 Cómo se verifica que un índice sirve: `EXPLAIN`, no intuición

Cada índice de §2.8 tiene una condición de aceptación. Un índice que no cambia el plan no se justifica, y un índice que cambia el plan pero no el tiempo medido tampoco.

```sql
-- 1) ¿El planner usa el índice?
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id FROM v_scholarships_public
 WHERE internal_status IN ('OPEN','UPCOMING')
   AND deadline_at > now() AND deadline_at <= now() + interval '30 days'
 ORDER BY deadline_at LIMIT 100;
-- Aceptación: "Index Scan using scholarships_open_by_deadline"
--            y filas examinadas ≈ filas devueltas (no Seq Scan sobre 240 filas)

-- 2) ¿El GIN se usa y no degrada?
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM v_scholarships_public
 WHERE search_vector @@ websearch_to_tsquery('spanish', 'beca Containership naval');
-- Aceptación: "Bitmap Index Scan on scholarships_fts"
--            y "Rows Removed by Index Recheck" = 0

-- 3) ¿Alguna consulta hace Seq Scan donde no debe?
SELECT query, calls, mean_exec_time, rows
  FROM pg_stat_statements
 WHERE query ILIKE '%scholarships%'
 ORDER BY mean_exec_time DESC LIMIT 10;
```

**Umbrales de aceptación, con números y no con adjetivos:**

| Query | Objetivo a 300 filas | Objetivo a 5.000 filas | Acción si se supera |
|---|---|---|---|
| Q1 búsqueda | p95 < 100 ms | p95 < 250 ms | Revisar `search_rank` en vista vs función; evaluar índice funcional |
| Q3 deadlines | p95 < 20 ms | p95 < 50 ms | Revisar `LIMIT` y índice parcial |
| Q4 cola freshness | < 100 ms | < 500 ms | Si aparece `Seq Scan`, el índice parcial `scholarships_stale` ya no cubre el predicado: cambiarlo |
| Q5 métricas | < 50 ms | < 300 ms | Ahí sí hace falta caché: aquí nace el caso de la vista materializada (DS-06) |

**Qué pasa cuando `EXPLAIN` dice `Seq Scan` a 300 filas y todo funciona.** No se toca nada. Postgres elige secuencial por debajo de unos cientos de filas porque es **más rápido**, no por ignorance. El umbral en el que un `Seq Scan` pasa a ser un problema está en el orden de 1.000–3.000 filas para tablas de este ancho; se mide, no se supone. **Añadir índices "por si crece" es la forma más común de pagar escritura durante dos años a cambio de nada.**

### 7.4 Paginación: por qué `OFFSET` no es el problema que parece

Q1 usa `OFFSET`, y con `search-first` (D1) eso tiene una consecuencia que conviene escribir:

- **La calidad del ranking depende de que `websearch_to_tsquery` sea idéntico byte a byte en el `WHERE` y en el `ORDER BY`.** Si difieren, los resultados son relevantes pero **mal ordenados**, y no hay error. Por eso `:q` se normaliza una vez, en el borde, y se reutiliza (§5.3 de `security`: normalización + hash de intención).
- **A 300 filas, `OFFSET` es aceptable hasta la página 3.** El `LIMIT`/`OFFSET` de `OFFSET` tiene que recorrer N filas: la página 10 de 30 resultados cuesta 270 descartes. Cuando el corpus supere ~1.000 registros y la vista se use en modo "ver todo", la alternativa es **keyset pagination** (`(ts_rank, deadline_at, id) < (:last_rank, :last_deadline, :last_id)`), que es estable y además corrige un bug real de `OFFSET`: con datos entrando entre páginas, `OFFSET` **repite y salta registros**.

**Decisión:** `OFFSET` en MVP, con el techo de página documentado. Keyset cuando el corpus pase de 1.000 registros **o** cuando aparezca el primer reporte de salto de resultados. La condición se escribe ahora para que la decisión no dependa de que alguien se acuerde.

### 7.5 El coste de escribir un índice, que es el que se paga siempre

Un índice no es gratis: se paga en cada `INSERT`/`UPDATE` de la tabla. Con 300 filas y decenas de índices el coste es invisible, y por eso la disciplina hay que fijarla **ahora**, antes de que haya 5.000 filas y 20 índices.

| Regla | Enunciado |
|---|---|
| **R-1** | Ningún índice sin una query nombrada. §2.8 tiene la columna "Query que sirve" y es obligatoria |
| **R-2** | Los índices son **parciales** siempre que el predicado de la query lo permita. Un índice parcial sobre el 5% de las filas ocupa una fracción del espacio |
| **R-3** | Un índice sobre `search_vector` se mantiene porque el `UPDATE` de `title` es rarísimo: el título **no cambia** sin un cambio de versión del programa, que además genera `record_versions` |
| **R-4** | `CREATE INDEX CONCURRENTLY` para todo índice en producción; nunca dentro de una transacción |
| **R-5** | Cuando un registro pasa a `is_published = false`, los índices parciales lo excluyen automáticamente. No se "limpian" índices: se cambia el predicado |
| **R-6** | El coste total de escritura se revisa una vez al cruzar 1.000 filas, con `pg_stat_user_indexes.idx_scan = 0` como lista de candidatos a eliminar |

`idx_scan = 0` es el detector de índices inútiles, y se aplica en la revisión de R-6. **Un índice con cero usos en el periodo de revisión es coste puro.**

---

## 8. Aislamiento demo/real: por qué `is_demo` no es un flag

`architecture §12` establece dos reglas: un registro demo **nunca** se publica, y toda consulta pública filtra `is_demo = false`. Fase 4 las convierte en restricciones que no dependen de la disciplina.

### 8.1 Las cuatro capas de aislamiento

| # | Capa | Mecanismo | Qué rompe si falla |
|---|---|---|---|
| 1 | **Esquema** | `CHECK demo_never_published` (§2.4) + trigger `is_demo_immutable` (§2.7) | Nada: la DB no admite un demo publicado ni un demo que cambia de `false` a `true` |
| 2 | **Privilegios** | `v_scholarships_public` con `is_demo = false` en el `WHERE`; el rol de staging es distinto del de producción | Un `SELECT *` sin filtro no ve registros demo porque el rol no tiene privilegio sobre la tabla |
| 3 | **Entorno** | Base de datos distinta para staging y producción. Los registros demo **viven en la base de demo**, no como filas marcadas | Un backup de producción no contiene datos inventados. Es la capa que evita el escenarioExpiry: "el seed de demo se ejecutó por error contra producción" |
| 4 | **Verificación** | Test de §12: `v_metrics_dashboard` y `v_scholarships_public` devuelven `count(*) FILTER (WHERE is_demo)` = 0 | Un demo que se coló en el corpus público es detectable por métrica, no por memoria |

**La capa 3 es la que evita el daño de verdad, y es la que el resto no puede reemplazar.** Marcar filas en la misma base funciona mientras todos recordemos filtrar; una base separada funciona aunque nadie recuerde nada, porque el dato no está. El orden de preferencia es: **base separada > marca + filtro en la vista > marca + disciplina**. Se elige la primera porque el coste es un seed más y una configuración de conexión más.

### 8.2 Qué hace el trigger de inmutabilidad y por qué no basta solo

`is_demo` inmutable por trigger significa que **no se puede promover un registro demo a real**. La operación inversa —convertir un registro real en demo, por ejemplo para anonimizar un caso de soporte— sí se permite. La asimetría es intencionada:

- **Demo → real: prohibido.** Es la vía por la que un dato inventado entra en el corpus. Si hay que publicar un programa real, se ingesta desde su fuente con `provenance`; no se "desmarca" un demo.
- **Real → demo: permitido y auditado.** Es una operación de soporte legítima, y queda en `audit_trail` con autor y motivo.

Un trigger que prohibiera ambas direcciones sería más simple y **rompería el soporte**: "este registro tenía un dato personal, márcalo demo y anonimiza" dejaría de ser posible sin una migración.

### 8.3 El escenario que hay que ensayar

**"El seed de demo corrió contra producción y 5 registros quedaron publicados."** Es el incidente más probable de esta sección, y la respuesta no es prevención sino **detección + contención**:

| Paso | Acción | Por qué |
|---|---|---|
| 1 | `demo_never_published` (capas 1) | **La DB lo impide.** El seed inserta con `is_published = false`; cualquier intento de publicar uno viola el `CHECK` y la transacción entera falla |
| 2 | `v_metrics_dashboard` cuenta `is_demo` | Detección en la página de metodología, sin esperar a que nadie se queje |
| 3 | `audit_trail` + `status_history` | Se sabe quién, cuándo y desde qué run salieron los 5 registros |
| 4 | Kill switch por `source` | `sources.kill_switch = true` apaga la fuente entera, no fila por fila (§1.2). Es más rápido y más difícil de dejar a medias |

**Lo que este escenario deja claro:** con la capa 1 activa, el peor caso no es "demo en producción", es "el seed falló y no se publicó nada". Un fallo que no publica es un incidente de datos faltantes; uno que publica datos inventados es un incidente de confianza terminal (R3).
---

## 9. Verificación de Q3: ¿cuánto puede crecer el corpus desde EACEA RSS?

> **Q3 (`discovery §7`):** "¿Cuánto puede crecer el corpus de EACEA RSS? Si es pequeño, quizá la curación manual debe ser el canal principal." · Asignada a **Fase 4 (spike técnico)**. Es la pregunta que define la arquitectura de datos real, y la respuesta es la base de `AR-1`.

### 9.1 Método: separar lo verificado de lo inferido

Una respuesta a Q3 sirve solo si no mezcla tres cosas distintas: lo que se comprobó, lo que se deduce de lo comprobado, y lo que se supone. Cada afirmación de esta sección va etiquetada.

| Etiqueta | Significado |
|---|---|
| ✅ **Verificado** | Consta en `legal-matrix` con fecha de comprobación y URL |
| 🧮 **Deducido** | Se sigue de un dato verificado, sin necesidad de comprobar nada más |
| ❓ **No comprobado** | Requiere un spike o una medición que este documento no puede aportar |

### 9.2 La evidencia, tal como está

| # | Hecho | Etiqueta | Fuente |
|---|---|---|---|
| E1 | El RSS `node/253/rss_en` funciona y se parseó: ~25 ítems, con `consortium URLs`, ECTS, universidades y `pubDate` | ✅ | `legal-matrix` §EACEA (2026-09-30) |
| E2 | El feed **mezcla tres colecciones**: `Erasmus Mundus catalogue` (actual), `Erasmus Mundus catalogue Legacy` e `Intra-Africa Scholarships Legacy` | ✅ | ídem |
| E3 | Los ítems de colecciones `Legacy` **pueden ser programas vencidos** | ✅ | ídem |
| E4 | El feed **no es una lista canónica completa**: es un delta acotado de cambios recientes | ✅ | ídem |
| E5 | Las páginas de listado indican tamaños distintos por filtro: `Erasmus Mundus Catalogue (220)` frente a `(43)` con filtro 2025 | ✅ | ídem |
| E6 | `robots.txt` de EACEA: `Sitemap: https://www.eacea.ec.europa.eu/sitemap.xml`; `/search/` deshabilitado; sin `Crawl-delay` | ✅ | ídem |
| E7 | `erasmus-plus.ec.europa.eu` (páginas de programa) es `HABILITABLE`, CC BY 4.0, con crawling por sitemap/lista permitido y `/search/` deshabilitado | ✅ | `legal-matrix` §2b |
| E8 | Solo **una** fuente resulta claramente habilitable para automatización; Chevening es `AMBIGUOUS`/`UNVERIFIED`; DAAD, universidades, Fulbright y studyineurope.eu: no automatizar | ✅ | `discovery` (matriz de fuentes), `legal-matrix` |
| E9 | El RSS entrega ~25 ítems por consulta | 🧮 | E1 |
| E10 | El número de ítems nuevos **verdaderamente nuevos** por consulta es ≤ 25, y en régimen permanente mucho menor | 🧮 | E4: un feed de delta devuelve nodos ya vistos |
| E11 | El techo de candidatos enumerables vía listado es del orden de 220 (filtro sin año), no 300 | 🧮 | E5 |
| E12 | El sitemap de EACEA expone más nodos que el listado por colección | ❓ | Sin comprobar: **spike** |
| E13 | La calidad y unicidad de los registros extraídos del sitemap | ❓ | Sin comprobar: **spike** |
| E14 | El ritmo real de curación manual que permite alcanzar 300 registros | ❓ | Es Q1, no Q3: **se mide, no se supone** |

### 9.3 La aritmética que suele hacerse mal

La respuesta temptationsa es "25 ítems por día × 12 días = 300 registros". **Es falsa, y el error es instructivo.**

Un feed de delta (E4) no es una cola de altas: devuelve los nodos **modificados más recientemente**. En régimen permanente, la mayoría de los 25 ítems de cada consulta serán nodos que ya tenemos, con `pubDate` nuevo porque cambió algo menor. La **intersección** entre lo que el feed devuelve y lo que no tenemos es pequeña desde el principio y decrece.

Consecuencias:

- **No hay una cifra de "nuevos por día".** Hay una de "cambios por día", que es un número de mantenimiento, no de crecimiento. Confundirlas es lo que produce la promesa de "300 registros en dos semanas" que ningún corpus de delta puede cumplir.
- **El techo del listado es ~220 (E11), por debajo del gate de 300 (R5).** Aunque se enumerara el 100% del listado de EMJMD, seguiría faltando el gate. **El RSS nunca fue la respuesta a Q3.**
- **Los `Legacy` (E2, E3) son un riesgo, no una reserva.** Son programas que pueden estar vencidos: contarlos para cerrar el gap de 300 sería rellenar el corpus con filas que el producto no puede defender (R3).

### 9.4 Respuesta a Q3

> **Q3 — Respuesta: el corpus crecible desde el RSS de EACEA es de orden bajo (decenas, no cientos). El feed es un canal de mantenimiento, no de llenado. La curación manual es el canal principal de crecimiento, y el sitemap es el único candidato automático que queda por comprobar.**

Descomposición:

| Canal | Qué aporta | Veredicto |
|---|---|---|
| **RSS EACEA** (~25 ítems, delta, mezcla `Legacy`) | Detectar cambios y altas nuevas a lo largo del tiempo; refresco de deadlines | **Canal de mantenimiento.** Es lo que fija `AR-1`. No es semilla |
| **Listado de catálogo** (~220 sin filtro, ~43 con filtro 2025) | El techo real de candidatos de una colección | Techo **por debajo** del gate de 300. Útil como lista de verificación, no como generador |
| **Sitemap de EACEA** (`/sitemap.xml`, publicado y permitido) | Posible enumeración más amplia | **Spike pendiente** (E12, E13). Es el único camino automático que podría cambiar la respuesta, y por eso tiene fecha de revisión, no una conjetura |
| **`erasmus-plus.ec.europa.eu`** | Páginas de programa, `HABILITABLE`, CC BY 4.0 | Segundo canal de descubrimiento **legalmente limpio**. Mismo spike |
| **Curación manual** (Chevening y resto) | Registros con `source_url` + `last_verified_at` + licencia verificados a mano | **Canal principal.** Es lo que `discovery` ya llamaba estrategia legítima de MVP, y esta sección lo confirma con números |
| **DAAD, studyineurope.eu, Fulbright, universidades** | Volumen potencial alto | **Fuera de MVP.** Licencias restrictivas o `UNVERIFIED` (E8). No se automatizan ni se planifican aquí |

**Lo que esta respuesta cambia en la arquitectura (y no en las decisiones ya tomadas):**

| Consecuencia | Dónde |
|---|---|
| `sources.kind` distingue `automated` de `curated`, y `discovered_via` registra el canal | **DS-01**, §1.4.c |
| La cola P0–P3 (freshness) es **el** mecanismo de mantenimiento del corpus, no una tarea extra | §7.1 Q4, §1.17 |
| `cycle_label` es obligatoria para el corpus automatizado, porque el feed mezcla `Legacy` | §1.4.a, §5.3 |
| `kill_switch` por fuente es el control de contención para un canal que puede cambiar de forma sin aviso | §1.2, §8.3 |
| **No se añade una tabla "curados"**: los dos canales comparten gate de publicación, constraints y provenance | **DS-01** |

### 9.5 Condiciones para reevaluar esta respuesta

Se revisa cuando **ocurra cualquiera** de estas, no por calendario:

| Disparador | Acción |
|---|---|
| Spike del sitemap de EACEA encuentra > 300 nodos de programa con licencia y URL oficial utilizables | Evaluar un segundo adapter; **reabre ADR-001**, que hoy limita el MVP a un adapter |
| El RSS pasa a exponer un listado completo (no delta) | Rehacer la aritmética de E10; probablemente reabre la decisión de semilla |
| La lista de catálogo supera 300 para alguna colección | Cambia el techo (E11) y la respuesta de Q3 |
| `discovery` o `legal-matrix` reclasifican Chevening o DAAD como `HABILITABLE` | Reevalúa E8 y con ella el techo de la curación manual |
| La curación manual se estanca por debajo de 150 registros tras dos ciclos | Es Q1, no Q3, pero el techo de Q3 agrava el problema: **la respuesta correcta puede ser bajar el gate, no subir la promesa** |

### 9.6 Lo que no se hace para llegar a 300

Porque R3 es terminal y R5 dice que el gate se cumple con registros reales:

| No se hace | Por qué |
|---|---|
| Contar filas sin `source_url` + `last_verified_at` + licencia | `CHECK publish_requires_provenance` (§2.1) lo impide en la DB, no por política |
| Contar registros de colecciones `Legacy` sin verificar que sigan vigentes (E3) | "Quizá está cerrado" es exactamente el estado `UNKNOWN`; publicarlos sería afirmar sin evidencia |
| Publicar con `deadline_basis = 'inferred_from_cycle'` y contar el deadline como dato | El dato existe para ordenar y agrupar, no para instruir (§4.4) |
| Inflar con variantes por país, por nivel o por idioma del mismo programa | `duplicate_groups` existe para que eso no cuente como cobertura (§5) |
| Bajar el gate sin decirlo | La cobertura actual es **un dato visible** (R5), no un slogan. Si el gate baja, se publica el número real |

**La alternativa legítima es declararlo:** si la curación llega a 180 registros verificables, el producto se lanza diciendo "180 becas verificadas, cobertura parcial, con más profundidad en pocos países". Eso es un producto con el claim intacto. Un producto con 300 filas donde 120 son dudosas tiene el claim roto y ningún usuario lo sabe hasta que lo descubre (§9.6).

### 9.7 Relación con Q1 (y por qué no se resuelven aquí)

Q1 ("¿es alcanzable ≥300 registros por curación manual en un plazo razonable?") es una pregunta de **capacidad humana**, y esta sección no puede responderla: no hay medición de ritmo de curación en el repo. Lo que Q3 **sí** hace es cambiar la respuesta por defecto de Q1:

- Antes de Q3: "quizá la automatización nos lleva a 300".
- Después de Q3: **el techo de la automatización está por debajo de 300**, así que si el gate de 300 se cumple, será por curación manual — y Q1 se convierte en la pregunta de go/no-go del lanzamiento (`architecture §13`, riesgo 5).

**Medición de Q1 que sí se puede specify ahora** (es un dato, no un plan): ritmo de curación por semana, registrado en `audit_trail` vía `curator` + `curated_at`, y comparado con la curva needed. Si el ritmo no permite el gate en el plazo, la decisión que se toma es explícita: **se retrasa o se baja el gate. No se rellena el corpus.**

---

## 10. Retención, purga y plan de migración

### 10.1 Qué se purga y qué nunca

La pregunta "borramos datos" tiene una respuesta unequal según la tabla, y equivocarse en una de ellas es irreversible.

| Tabla | ¿Se purga? | Política | Motivo |
|---|---|---|---|
| `scholarships` | **Nunca físicamente** | Solo `deleted_at` + `delete_reason`. El `CHECK delete_requires_unpublish` obliga a despublicar antes | `security §6.1`; y un registro despublicado es evidencia de que existió esa beca |
| `status_history`, `audit_trail` | **Nunca** | Append-only por trigger (§2.7) y `ON DELETE RESTRICT` (§2.6) | Son la prueba de I4. Un `DELETE` sobre ellas falla en la DB |
| `record_versions` | **Nunca** | Append-only. Es el snapshot con el que se explica una corrección | Sin ellos, "publicamos una corrección" (R3) no tiene con qué corregirse |
| `fetch_log` | **Nunca**, dentro de la ventana de retención legal | Se conserva por la licencia de la fuente y para re-verificar | Es la evidencia de qué se pidió, cuándo y con qué resultado |
| `sync_runs` | **Nunca** | Es la unidad de salud de fuente (M4) y de M7 | Un run borrado hace inexplicable un salto en las métricas |
| `field_provenance` | **Nunca** mientras exista el registro | `ON DELETE CASCADE` solo si el registro se borra, y no se borra | I3 |
| `validation_violations` | **Nunca**; se **resuelve** (`resolved_at`, `resolution`) | Un violation resuelto se conserva: es el histórico de calidad | M6 necesita la tasa de violations, no solo las abiertas |
| `search_events` | **Sí, con retención** | 90 días, y **nunca** con payload de texto libre | Es el único volumen alto; y no contiene nada que no se pueda volver a agregar |
| `duplicate_groups` | **Nunca** | Un grupo con historia se disocia (`ON DELETE SET NULL`), no se borra | La decisión de merge es en sí misma un hecho auditable |

**El principio detrás de la tabla:** solo se purga lo que es **agregado y reconstruible** (`search_events`). Todo lo que es un **hecho sobre una beca** es permanente. La razón no es puritismo: es que la promesa del producto es "cada afirmación tiene fecha, fuente y responsable", y un hecho del que se puede perder la fecha no cumple la promesa.

### 10.2 Unicidad parcial: cómo se expresan reglas "suaves" en SQL

Varias reglas del modelo son "único entre los que están activos", no "único siempre". En SQL eso se resuelve con índices **únicos parciales**, no con una columna nullable y un `CHECK`.

```sql
-- pseudo-SQL

-- El slug público es único SIEMPRE, incluso entre borrados: una URL pública
-- que se reutiliza para otra beca es un 404 silencioso y un problema de caché.
CREATE UNIQUE INDEX scholarships_slug_key ON scholarships (slug);

-- Un mismo programa en la misma fuente solo puede estar activo una vez.
-- Los registros soft-deleted quedan fuera del índice, así que el programa
-- puede volver a aparecer con un slug nuevo.
CREATE UNIQUE INDEX scholarships_active_source_key
  ON scholarships (source_id, external_id)
  WHERE deleted_at IS NULL AND external_id IS NOT NULL;

-- Un grupo tiene exactamente un canónico (architecture §7.2, §2.4).
CREATE UNIQUE INDEX one_canonical_per_group
  ON duplicate_members (duplicate_group_id) WHERE is_canonical;

-- El token de shortlist es único entre los no expirados.
CREATE UNIQUE INDEX shortlist_active_token_key
  ON shortlist_shares (token_hash) WHERE expires_at IS NULL;
```

**Por qué `NULL` en `external_id` no rompe el índice.** En SQL, dos `NULL` **no** son iguales, así que un índice único sobre `(source_id, external_id)` admite **todos** los registros con `external_id IS NULL`. Eso es exactamente lo que se quiere: un registro de curación manual que no conoce el ID de la fuente no debe bloquear a otro. Y por eso el `WHERE external_id IS NOT NULL` del índice parcial es redundante pero explícito: documenta la intención y protege si alguien añade después un `NULLS NOT DISTINCT`.

**El trade-off honesto de la unicidad parcial:** un índice único parcial **no** se puede usar como clave foránea. No se puede garantizar que exista "como mucho uno activo" desde el FK; se garantiza desde el índice. La contrapartida es que el error es un `unique_violation` en el `INSERT` y no un aviso, y que hay que escribir el mensaje de error para que el operador entienda qué encontró (`(source_id, external_id)` ya tiene un registro activo, id = …).

### 10.3 Secuencia de migración y reversibilidad

Cada paso de §2.11 tiene su reverso, y **la reversibilidad se diseña antes de aplicar**, no se improvisa con un `DROP`.

| Paso | Aplicación | Reverso | Riesgo del paso |
|---|---|---|---|
| 1. Extensiones | `CREATE EXTENSION unaccent` | `DROP EXTENSION` (solo si nadie depende) | Bajo. Se verifica disponibilidad **antes** |
| 2. Tablas base | `CREATE TABLE` | `DROP TABLE` (vacía, es nueva) | Bajo |
| 3. `scholarships` + columnas nuevas | `ADD COLUMN … NULL` / `ADD COLUMN … DEFAULT` | `DROP COLUMN` | **Medio**: `ADD COLUMN NOT NULL DEFAULT` reescribe la tabla en Postgres < 11. Se usa `NOT NULL DEFAULT` solo en columnas de control (vacías en el corpus) |
| 4. Backfill | `UPDATE` por lotes, commit por lote | Reverso: `UPDATE` a `NULL`/`'UNKNOWN'` con el mismo criterio | **Alto**: es el paso donde se inventan valores. Regla dura: `NULL` o `'UNKNOWN'` |
| 5. FKs e índices únicos | `ADD CONSTRAINT` / `CREATE UNIQUE INDEX CONCURRENTLY` | `DROP CONSTRAINT` | **Alto**: un índice único parcial falla si el corpus ya tiene duplicados. **Se comprueba antes de crear** |
| 6. `CHECK` | `ADD CONSTRAINT … NOT VALID` + `VALIDATE CONSTRAINT` | `DROP CONSTRAINT` | Medio: `NOT VALID` evita el `ACCESS EXCLUSIVE` sobre 300 filas; irrelevante a este volumen, patrón correcto por si el corpus crece |
| 7. Triggers | `CREATE TRIGGER` | `DROP TRIGGER` | Bajo, pero **al final**: bloquean la carga inicial |
| 8. Vistas | `CREATE VIEW` | `DROP VIEW` | Bajo |
| 9. Privilegios | `REVOKE`/`GRANT` | Revertir | **Al final**: un `REVOKE` prematuro rompe la carga |

**La comprobación del paso 5, escrita antes de necesitarlo:**

```sql
-- ¿El corpus actual violaría el índice único parcial?
SELECT source_id, external_id, count(*) AS n
  FROM scholarships
 WHERE deleted_at IS NULL AND external_id IS NOT NULL
 GROUP BY source_id, external_id
HAVING count(*) > 1;
-- Aceptación: 0 filas. Si sale algo, se resuelve con §5 (dedupe) ANTES de migrar.
```

**Ese `SELECT` es la razón por la que §5 (dedupe) está antes que §10 en el orden de lectura:** crear el índice único sobre un corpus con duplicados reales no falla en desarrollo con 10 filas y falla en producción con 3.000.

### 10.4 Backups: configurados no es restaurados

`AR-14` dice que el corpus curado a mano no es reproducible por pipeline: si Postgres se pierde, los 300 registros se pierden con él. La respuesta no es "configura backups" sino **un restore drill con fecha**.

| Elemento | Requisito | Por qué |
|---|---|---|
| Backup automático | PITR con retención ≥ 30 días | Un `DELETE` accidental se detecta a lo sumo en un mes |
| **Restore drill** | **Trimestral, con resultado escrito** | Un backup que nunca se restauró no es un backup: es una hipótesis |
| Export versionado del corpus | CSV/JSON semanal, en el repo o en almacenamiento | Si el proveedor de BD desaparece, el backup vive en el mismo proveedor |
| `curator` + `curated_at` | Obligatorios en toda curación | Permite reconstruir **la decisión**, no solo la fila |
| `record_versions` | Append-only | Reconstruye el estado del corpus en cualquier fecha pasada |

**El backup responde "¿perdimos los datos?". No responde "¿publicamos algo falso?"**, y no debe pretender hacerlo. Para eso están `status_history`, `field_provenance` y `audit_trail`: la evidencia vive **dentro** de la base, no en el backup. Un backup correcto restaura el historial; si el historial no está en la base, no hay nada que restaurar.

---

## 11. Trazabilidad: de cada invariante a su prueba

La tabla que hace que este documento sea auditable. Cada invariante tiene una restricción, un test y una consecuencia observable si se viola.

| # | Invariante | Restricción 🔒 (§) | Test (§12) | Qué se ve si falla |
|---|---|---|---|---|
| I1 | Nada se publica sin `source_url` + `last_verified_at` + `source_licence` + `source_id` | `publish_requires_provenance` (§2.1) | A-1 | Un registro sin fuente en la página de metodología. Métrica M3 > 0 |
| I2 | Un fallo de verificación nunca produce `CLOSED` | `resolveStatus()` pura (§3) + `unknown_requires_reason` (§2.2) | A-2 + matriz de 30 casos (§3.7) | Un "CERRADA" que la fuente nunca dijo. Es el peor fallo posible del producto |
| I3 | Todo campo publicado es atribuible | `field_provenance` UNIQUE por (registro, campo) (§1.7) | A-3 | Un dato sin origen. `field_provenance` deja de ser fiable |
| I4 | Todo cambio de estado deja rastro | `status_history` + `audit_trail` append-only + `RESTRICT` (§2.6, §2.7) | A-4 | Un estado sin historia. La página de metodología deja de poder explicar un cambio |
| I5 | Un countdown nunca es inventado | 5 `CHECK` de deadline (§2.3) + 6 condiciones en la vista (§4.2) | A-5 + paridad de vista | "0 días" o un countdown sobre `UNKNOWN`/`inferred_from_cycle` |
| I6 | Un registro demo jamás es público | `demo_never_published` + trigger `is_demo_immutable` (§2.4, §2.7) + filtro en vista (§1.17) | A-6 | Un dato inventado en producción |
| I7 | Un duplicado es un hecho, no una suposición | `one_canonical_per_group` + `one_group_per_scholarship` (§2.4) | A-7 | M6 > 0 en la página de metodología |
| I8 | Un `UNKNOWN` nunca borra evidencia previa | `unknown_keeps_evidence` (§2.2, **H4**) | A-8 | Fechas que aparecen y desaparecen entre runs |

**Invariante no cubierto por una restricción, y por qué es aceptable:** "un countdown nunca es inventado" (I5) se cumple en los datos por `CHECK` pero **en el render por la vista** (H4). Se acepta porque la alternativa destruye datos, y se compensa con el test de paridad A-5, que falla si la vista deja de cumplir las seis condiciones.

---

## 12. Verificación ejecutable

Consultas que **deben devolver 0 filas o 0**. Si alguna devuelve algo, hay un bug de datos, y el sitio de comprobación es el pipeline, no una persona mirando la página.

```sql
-- A-1 · I1: ningún registro publicado sin procedencia completa.
--          Devuelve filas si el CHECK se explota por NULL o por un bypass de rol.
SELECT id, slug FROM scholarships
 WHERE is_published
   AND (source_url IS NULL OR source_licence IS NULL OR source_licence = 'NONE'
        OR last_verified_at IS NULL OR source_id IS NULL);
-- Aceptación: 0 filas.

-- A-2 · I2: ningún registro CLOSED cuya fuente nunca lo dijo.
--          Un CLOSED con source_status distinto de 'CLOSED' es una inferencia, y
--          discovery §4.3 solo permite CLOSED por declaración explícita.
SELECT id, slug, source_status, status_reason FROM scholarships
 WHERE internal_status = 'CLOSED'
   AND (source_status IS DISTINCT FROM 'CLOSED')
   AND status_reason NOT ILIKE '%fuente%';
-- Aceptación: 0 filas. Si sale alguna: la razón explica un CLOSED por inferencia.

-- A-3 · I3: todo registro publicado con campo visible tiene provenance.
--          Campos T0 de la tarjeta de resultado (discovery §9.4).
SELECT s.id, s.slug
  FROM scholarships s
 WHERE s.is_published AND NOT s.is_demo AND s.deleted_at IS NULL
   AND EXISTS (
     SELECT unnest(ARRAY['title','provider','country_iso2','level',
                          'funding_type','deadline_at','source_url']) AS campo
       WHERE NOT EXISTS (SELECT 1 FROM field_provenance fp
                          WHERE fp.scholarship_id = s.id AND fp.field_name = campo));
-- Aceptación: 0 filas. (La lista de campos T0 es explícita: una lista cerrada, no "los que hay".)

-- A-4 · I4: el historial sobrevive a los registros.
--          Su ausencia en un registro con cambios de estado es la falla.
SELECT s.id, s.slug FROM scholarships s
 WHERE s.deleted_at IS NULL AND s.is_published
   AND NOT EXISTS (SELECT 1 FROM status_history sh WHERE sh.scholarship_id = s.id)
   AND s.last_known_status_at IS NOT NULL;
-- Aceptación: 0 filas.

-- A-5 · I5: paridad entre la vista y la query de countdown (Q3 de §7.1).
--          Las dos expresiones deben devolver exactamente los mismos ids.
WITH por_vista AS (
  SELECT id FROM v_scholarships_public
   WHERE internal_status IN ('OPEN','UPCOMING') AND deadline_at IS NOT NULL
     AND deadline_basis = 'publisher_stated' AND deadline_precision <> 'UNKNOWN' AND deadline_at > now()),
por_query AS (
  SELECT id FROM v_scholarships_public
   WHERE internal_status IN ('OPEN','UPCOMING') AND deadline_at IS NOT NULL
     AND deadline_basis = 'publisher_stated' AND deadline_precision <> 'UNKNOWN'
     AND deadline_at > now() AND countdown_raw IS NOT NULL)
SELECT 'solo_en_query' AS lado, id FROM por_query EXCEPT SELECT 'x', id FROM por_vista
UNION ALL
SELECT 'solo_en_vista', id FROM por_vista EXCEPT SELECT 'x', id FROM por_query;
-- Aceptación: 0 filas. Divergencia = el countdown se está calculando fuera de las 6 condiciones.

-- A-5b · I5: ningún countdown sobre un estado que no debe tenerlo.
SELECT id, internal_status, deadline_at, countdown_raw FROM v_scholarships_public
 WHERE (internal_status NOT IN ('OPEN','UPCOMING') AND countdown_raw IS NOT NULL)
    OR (internal_status = 'UNKNOWN'              AND countdown_raw IS NOT NULL)
    OR (deadline_basis = 'inferred_from_cycle'   AND countdown_raw IS NOT NULL)
    OR (deadline_at IS NOT NULL AND deadline_at <= now() AND countdown_raw IS NOT NULL);
-- Aceptación: 0 filas. Este es el test que hace que H4 no dependa de la vista.

-- A-6 · I6: ningún registro demo en la superficie pública.
SELECT count(*) AS demos_en_la_vista FROM v_scholarships_public WHERE is_demo;
-- Aceptación: 0.

-- A-7 · I7: M6 calculable y cada grupo con exactamente un canónico.
SELECT dg.id, count(*) FILTER (WHERE dm.is_canonical) AS canonicos
  FROM duplicate_groups dg JOIN duplicate_members dm ON dm.duplicate_group_id = dg.id
 GROUP BY dg.id HAVING count(*) FILTER (WHERE dm.is_canonical) <> 1;
-- Aceptación: 0 filas.

-- A-8 · I8: ningún UNKNOWN que haya perdido su evidencia (H4).
SELECT id, slug, internal_status, last_known_status, last_verified_at FROM scholarships
 WHERE internal_status = 'UNKNOWN'
   AND last_verified_at IS NOT NULL AND last_known_status IS NULL;
-- Aceptación: 0 filas. Si sale algo, un fallo de red borró evidencia (H4).

-- A-9 · Higiene de deadline: fechas que no deberían existir.
SELECT id, slug, deadline_at, deadline_raw_text FROM scholarships
 WHERE deadline_at IS NOT NULL
   AND (deadline_raw_text IS NULL OR deadline_basis = 'unknown' OR deadline_tz IS NULL
        OR deadline_precision = 'UNKNOWN' OR deadline_at < timestamptz '2000-01-01 00:00:00+00'
        OR deadline_at > timestamptz '2100-01-01 00:00:00+00');
-- Aceptación: 0 filas. (Ninguna de estas condiciones debería ser posible por CHECK; que
-- salgan filas significa que alguien añadió una ruta de escritura que no pasa por la tabla.)

-- A-10 · Sin demo en las métricas de metodología.
SELECT count(*) AS demos_en_metricas FROM v_metrics_dashboard WHERE demos > 0;
-- Aceptación: 0 filas.
```

**Cómo se ejecutan.** A-1..A-10 son aserciones de datos, no unit tests de aplicación. Se ejecutan (a) en el pipeline, después de cada migración; (b) **diariamente**, porque un `UPDATE` manual que alguien hizo en la consola de producción no pasa por ningún pipeline; y (c) antes de cada lanzamiento. Si una aserción falla, la aserción **bloquea el deploy**, no genera un aviso: un corpus que viola I1 no se publica.

### 12.1 Los dos tests que no son SQL

| Test | Qué verifica | Por qué no es SQL |
|---|---|---|
| **Paridad de countdown en cliente** | El countdown que ve el usuario coincide con `countdown_raw` de la vista, en las dos zonas horarias de prueba (UTC−5 y UTC+13) | El bug de R6 es de render, no de query |
| **Ruido de `resolveStatus()`** | 30 casos de §3.7 se ejecutan contra la función real y el resultado esperado, incluyendo los 18 `fetchOutcome` | Es lógica pura; se testea como función, no con datos |

---

## 13. Decisiones abiertas — RESUELTAS CON APROBACIÓN DEL USUARIO y lo que necesita firma

Nada de esto se resuelve por suposición. Cada fila indica quién tiene que decidir y qué pasa si no se decide.

| # | Pregunta | Estado | Quién decide | Si no se decide |
|---|---|---|---|---|
| 1 | ¿300 es el gate, o se acepta lanzar con menos y decirlo? (`architecture §13`, riesgo 5) | **Abierta** | Producto + negocio | Se lanza por debajo del gate sin haberlo declarado, que es la forma menos defendible de ambas |
| 2 | ¿Ritmo de curación manual suficiente? (Q1) | **Abierta, se mide** | Curación | Se planifica un corpus que no se puede llenar |
| 3 | ¿El sitemap de EACEA supera los 300 nodos útiles? (E12, E13) | **Spike pendiente** | Backend | Se mantiene la respuesta de §9 sin comprobar la única vía que la podría cambiar |
| 4 | ¿`slug` derivado del título (SEO) o aleatorio (no enumeración)? | **Propuesta: aleatorio**, según el ERD | Producto + seguridad | Se implementa el que aparezca primero |
| 5 | ¿`unaccent` con wrapper `IMMUTABLE` funciona en el proveedor? (§2.9) | **A verificar en Fase 5** | Backend | AR-3 (búsqueda sin acentos) se pierde en silencio |
| 6 | ¿DS-03 (`inferred_from_cycle` nunca produce `OPEN`/`EXPIRED`) es más estricto de lo que dice `discovery §4.4`? | **Propuesta, requiere firma** | Producto + datos | Se implementa sin revisar, y es una desviación del documento dediscovery |
| 7 | ¿DS-05 (countdown en días naturales con nota) es aceptable para Fase 6? | **Propuesta, requiere firma** | Producto + diseño | El countdown del caso `DATE` se implementa dos veces por dos personas distintas |
| 8 | ¿Se publica `deadline_precision` y `deadline_tz` al cliente? (§2.10) | **Propuesta: sí** | Frontend + legal | El cliente no puede auditar el countdown que muestra |
| 9 | ¿Base de datos separada para demo, o filas marcadas? (§8.1) | **Propuesta: separada** | Backend + operaciones | Un seed mal ejecutado publica datos inventados en producción |
| 10 | ¿Base para las aserciones A-1..A-10 en CI, o nightly? (§12) | **Propuesta: pipeline + diario** | Datos | Los errores de integridad se descubren cuando un usuario los ve |

**Ninguna de estas diez preguntas es una decisión técnica que este documento pueda tomar por su cuenta.** Las diez están aquí porque el diseño funciona con cualquiera de las dos respuestas de cada una, y porque la elección tiene que ser consciente y escrita. Lo que este documento fija es el **coste** de cada opción, para que la decisión no se tome por descuido.

---

## Anexo A · Glosario de columnas y tablas añadidas

Todas son **aditivas**: ninguna cambia ni contradice una columna o relación del ERD de `architecture §7.1`. La columna "por qué no estaba" es la parte importante del glosario.

| ID | Elemento | Tipo | Por qué no estaba en el ERD |
|---|---|---|---|
| **ADD-01** | `scholarships.source_id` | `uuid` FK → `sources` | La relación `SOURCES ‖--o{ SCHOLARSHIPS` está en el propio ERD, pero la columna no. Sin ella, el índice de frescura de `architecture §7.2` no compila (H1) y I1 no puede exigir fuente |
| **ADD-02** | `scholarships.external_id` | `varchar(200)` | `NormalizedScholarship.externalId` existe en el contrato (§8). Es la identidad fuerte de dedupe: sin él solo queda la URL |
| **ADD-03** | `scholarships.deadline_precision` | `varchar(20)` | Es **la** columna que hace posible R6. Sin ella, "cierra el 6 a las 11:00" y "cierra el 6" son indistinguibles |
| **ADD-04** | `scholarships.destination_countries` | `text[]` | El contrato tiene `destinationCountries` como array. Un EMJM tiene 2–6 países; `country_iso2` solo pierde datos reales del catálogo |
| **ADD-05** | `scholarships.deadline_date_order` | `varchar(8)` | `15/10/2026` es 15-oct en Europa y 15-ene en EEUU. Sin el orden declarado, el parser tiene que adivinar |
| **ADD-06** | `CHECK amount > 0` | restricción | El ERD declara `amount` nullable, no su dominio. Un monto negativo es un dato roto que ningún `CHECK` de §7.2 atrapaba |
| **ADD-07** | `scholarships.cycle_label` | `varchar(40)` | El feed mezcla colecciones `Legacy` con las actuales (E2). Sin ciclo, tragar el feed mete programas vencidos |
| **ADD-08** | `duration_months`, `ects` | `smallint` | Vienen del feed como "ECTS Duration" y son datos de catálogo, no estimaciones. `null` si no están |
| **ADD-09** | `scholarships.needs_review_reason` | `varchar(200)` | `needs_review` sin motivo es un bool que nadie puede priorizar. La cola se agrupa por motivo (§7.2 OQ-2) |
| **ADD-10** | `scholarships.possible_duplicate_of` | `uuid` FK → `scholarships` | Separa la **señal** automática del **hecho** confirmado (DS-08). Cuesta un minuto humano revisar una pista; cuesta mucho equivocar un grupo |
| **ADD-11** | `scholarships.search_vector` | `tsvector` GENERATED | El índice de expresión de §7.2 obliga a que la expresión del `ORDER BY` coincida byte a byte. Divergir produce rankings erróneos **sin error** |
| **ADD-12** | `duplicate_groups` | tabla | `duplicate_group_id` es una FK sin tabla destino en el ERD, y `one_canonical_per_group` necesita un destino válido |
| **ADD-13** | `validation_violations` | tabla | Sin ella, `needs_review_reason` es texto libre y M6 no se puede calcular de forma fiable |
| **ADD-14** | `timezones` | tabla | Sin catálogo, `deadline_tz` acepta `CET`, `PST` y `Europe/Madrid` como si fueran equivalentes |

**Ningún `ADD` cambia un tipo existente, elimina una columna ni altera una relación.** La única decisión que **añade** estructura es ADD-12 (una tabla), y existe porque el ERD ya la referenciaba sin definirla.

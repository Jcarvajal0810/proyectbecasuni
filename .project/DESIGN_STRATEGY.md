# DESIGN STRATEGY — Fase 3 · 2026-09-29
Agente: design-strategist · Skills: designing-user-experience, designing-frontend-interfaces, building-accessible-interfaces · Estado: **pendiente de aprobación**

## Hallazgos sobre el contrato de datos
- F1 `becas_publicas` sin fecha de publicación → no hay "nuevas" honestas; usar "verificadas recientemente".
- F2 `idioma_requisito` texto libre → no filtrable.
- F3 `monto` sin periodo → engañoso.
- F4 próxima convocatoria sin su `url_fuente`.
- F5 `por_confirmar` tiene dos causas (sin fecha / rolling con verificación antigua), distinguibles en cliente.
- F6 `dias_restantes` usa ceil → texto "Cierra hoy · menos de 24 h".
- F7 umbral de verificación antigua = carga de re-verificación del curador.
- F8 vista previa de WhatsApp genérica (SPA sin SSR).
- F9 el globo en móvil atrapa el scroll.
- F10 emojis de bandera no se ven en Windows.
- F11 catálogo cargado en cliente → conteos por filtro y globo filtrado son baratos.

## Decisiones propuestas
1. **Umbrales:** `dias_cierra_pronto` = **30** (preparar postulación toma semanas; revisar si ≥ 40 % del catálogo abierto cae en cierra_pronto → 21). `dias_verificacion_antigua` = **120** (~3 re-verificaciones/año por rolling). Badge: "Verificado hace más de 4 meses · confirma en la fuente oficial"; siempre "Verificado el 12 sep 2026".
2. **Rolling y por confirmar:**
   - Rolling: "Abierta · postulación continua", sin contador, bloque tras las de fecha, ilumina el globo.
   - Por confirmar: fuera de resultados principales, grupo plegado "Por confirmar (N)"; nunca ilumina.
   - Orden: con fecha (primero "Cierran en los próximos 30 días") → continua → por confirmar (plegado) → cerradas (solo con "Ver cerradas").
   - "Cierran pronto" = primer tramo de la lista, no carrusel.
3. **Deadline y zona:**
   - Tarjeta: "Cierra 15 dic 2026 · quedan 12 días".
   - Detalle: fecha/hora en la zona oficial ("hora de Londres (Europe/London)") + "En tu hora (zona del navegador)"; aviso si la fuente no indica zona.
   - Formato con `Intl.DateTimeFormat('es-CO')`. Si el plazo venció con caché vieja: "Plazo vencido · actualizando".
4. **Globo vacío:**
   - Contador honesto "Hoy: N becas abiertas en M países".
   - Temporada baja → "Próximas aperturas con fecha oficial" + "Por confirmar"; búsqueda protagonista con 0 abiertas.
   - Un solo tono de iluminación; país apagado seleccionable con respuesta honesta.
   - Propuesta (requiere OK de architect, R9): el globo refleja los filtros activos (agregado en cliente).
5. **Interacción:**
   - A. Globo: hover → clic → centrar → `/pais/:iso2` → foco en h1.
   - B. Intención: búsqueda + filtros clave arriba, 1-3 pasos.
   - C. Enlace compartido `/beca/:slug`: sin globo; CTA "Ir a la convocatoria oficial" con dominio visible; cerrada → similares; no encontrada → buscador.
   - URL: país en el path, resto en la query en español; país = push, filtros = replace.
   - Escritorio: globo persistente entre rutas.
   - Nacionalidad "Soy de": incluye sin dato marcado "consultar convocatoria".
   - Filtro de idioma oculto hasta tener dato estructurado.
   - Móvil: tap en país → hoja inferior de confirmación + "¿Buscabas…?".
   - Accesibilidad: canvas `aria-hidden` + lista visible "Países con becas abiertas" como equivalente; "Mostrar 20 más" (sin scroll infinito).
6. **Estados:**
   - Skeletons con `aria-busy`; el globo reserva espacio y nunca bloquea la lista.
   - Empty con sugerencias con conteo ("Quitar X → 4 becas").
   - Error: "No pudimos cargar las becas" + Reintentar, sin caché vieja.
   - Partial: "Consultar convocatoria".
   - Fallback del globo por motivo; dispositivo débil / saveData → botón "Cargar globo".
   - **Ajuste propuesto:** con reduced-motion se ofrece "Mostrar globo" (sin animaciones) en vez de fallback directo.
7. **Dirección visual:** recomendación **híbrido A+B**.
   - A "Registro verificado": editorial/documental, serif + sans, papel y tinta, un acento, globo cartográfico, sello de verificación.
   - B "Tablero de plazos": cifras tabulares, columna de estado.
   - C "Nocturno cinematográfico": descartada.
   - Reglas: máx. 2 familias autoalojadas (Fontsource) con cifras tabulares; sin modo oscuro en el MVP.
   - Motion solo funcional: cámara al centrar, realce hover, hoja/diálogo, plegables. Sin auto-rotación, contadores, parallax ni scroll-jacking.
   - **No utilizar:** gradientes morados, glassmorphism, estrellas/atmósfera/arcos, hero+3 tarjetas, carruseles, blobs, emojis/banderas, logos de instituciones, GSAP/Framer/Lottie/three a mano, toasts para resultados, modales al entrar, montos convertidos.
   - Stack: shadcn (Sheet, Command, Collapsible, Badge), TanStack Query, Intl, react-globe.gl en chunk lazy.
8. **Responsive y rendimiento:**
   - Móvil primero, **globo bajo demanda** ("Explorar en el globo" → pantalla completa).
   - Escritorio ≥ 1024 px con puntero fino: dos columnas.
   - Filtros móviles en Sheet con "Ver N becas".
   - Referencia: Core Web Vitals "good" (LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1, p75).
   - Medir: LCP en Android medio con 4G, INP al filtrar, CLS del globo, JS inicial vs chunk del globo, `globe_loaded`, fallback por motivo.
9. **Accesibilidad WCAG 2.2 AA:**
   - Estados con texto + icono distinto: Abierta ●, Cierra pronto reloj, Continua ↻, Por confirmar ◌/?, Cerrada candado; texto ≥ 4,5:1, iconos ≥ 3:1.
   - Globo ≥ 3:1 + leyenda.
   - Foco visible no tapado; objetivos ≥ 24 px (44 en táctil).
   - Live region polite con debounce; `role="alert"` en errores; HTML semántico.
   - Ayuda consistente.
   - Auditar con NVDA y VoiceOver.
10. **Eventos PostHog** (autocapture off, sin texto libre, UTM en enlaces compartidos):
    - `$pageview`
    - `globe_loaded` {load_ms, countries_lit, device_class, trigger}
    - `globe_opened` {source}
    - `globe_fallback_shown` {reason}
    - `country_selected` {country_iso2, n_open, via}
    - `search_used` {query_length, results_count}
    - `filter_applied` {filter, value, results_count, active_filters_count}
    - `filters_cleared` {from_empty_state}
    - `status_group_toggled` {group, enabled}
    - `empty_results_shown` {context, active_filters, country_iso2?}
    - `empty_suggestion_clicked` {suggestion, filter?}
    - `scholarship_viewed` {slug, estado, tipo_deadline, source}
    - **`official_url_clicked`** {slug, estado, dias_restantes, verificacion_antigua, placement}
    - `share_clicked` {target, page, slug?}
    - `report_error_clicked` {slug}
    - `scholarship_not_found` {slug}
    - `data_load_failed` {resource, error_kind, retry_count}
    - `nac` es cuasi-dato personal → revisar en Fase 11.
11. **Cambios de datos** (dueño `database`):
    - a) `publicada_el` en la vista.
    - b) `idiomas_requeridos` ISO 639-1[] + certificación.
    - c) `monto_periodo`.
    - d) opcional `url_fuente` de la próxima convocatoria.
    - e) config 30/120.

## Riesgos
R1 globo vacío · R2 vista previa de WhatsApp genérica · R3 umbrales hipotéticos · R4 zona horaria · R5 elegibilidad mal leída · R6 Lovable genera un globo genérico o un scroll-trap → prohibir explícitamente en el brief · R7 filtro de idioma depende de 11b · R8 heurística de dispositivo débil · R9 globo filtrado cambia D4.

## Conectores propuestos
- Figma para Fase 4 (3 pantallas + tokens) — alternativa: VISUAL_DIRECTION.md + prototipo Lovable en plan_mode.
- Formulario externo para "Reportar error" (Tally / Google Forms con slug prellenado) — alternativa: `mailto:`.

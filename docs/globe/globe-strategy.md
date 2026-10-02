# Estrategia del Globo 3D (Globe Strategy)

> **ADR-001** — El globo 3D **NO** entra en el MVP.
> Ámbito: **post-MVP únicamente**.
> Propósito: fijar las condiciones de evaluación, principios, UX, rendimiento, accesibilidad y gating para que un globo futuro no degrade la claridad, la honestidad ni la usabilidad del producto.

---

## 1. Veredicto

**El globo NO entra en el MVP.** La decisión se mantiene alineada con `ADR-001` y con los hallazgos de `discovery.md` §2.1 y §6.

Para que pueda evaluarse objetivamente post-MVP debe cumplir **las 4 condiciones siguientes de forma simultánea**:

| # | Condición | Criterio de aceptación (medible) | Fuente |
|---|---|---|---|
| **(a)** | **Cobertura real verificable** | ≥500 registros **verificables** en **≥40 países** (ISO 3166-1) | `data-strategy.md`, `discovery.md` §6 |
| **(b)** | **Mejora medible en descubrimiento** | Test con usuarios (no opinión): mejora estadísticamente significativa frente al listado 2D en task completion, tiempo de hallazgo o recall | `ux-strategy.md`, `value-impact-refinement.md` |
| **(c)** | **Rendimiento estable + fallback robusto** | **FPS ≥30** sostenido en móvil objetivo (mid-range), con **fallback 2D automático y funcional** | `architecture.md`, `ux-strategy.md` |
| **(d)** | **No oculta los gaps** | La visualización **no sugiere cobertura total**; los países sin becas verificables se representan como vacíos explícitos | `discovery.md` §4.6 |

**Regla de gating:** si **alguna** de las 4 falla, se **descarta**. No se admite compromiso parcial.

---

## 2. Por qué NO entra en el MVP

| Razón | Explicación | Referencia |
|---|---|---|
| **Lookup preciso ≠ navegación espacial** | Las representaciones 3D dificultan tareas de búsqueda y localización precisa frente a 2D plano | ICA-ABS 2018; Tory et al., *IEEE TVCG* 2006 |
| **Ilusión de cobertura total** | Un globo con glow tiende a percibirse continuo y completo. Con cobertura **parcial** es mentira visual | `discovery.md` §4.6 |
| **Riesgo técnico 3P** | Complejidad, peso y puntos de fallo de terceros sin resolver un problema validado del MVP | `architecture.md` |
| **Rendimiento y accesibilidad** | Impacta FPS móvil, consumo, LCP y `prefers-reduced-motion`. El MVP prioriza rendimiento universal | `ux-strategy.md` |
| **Utilidad real, no estética** | El problema validado es encontrar y filtrar becas verificables, no explorar el planeta estéticamente | `value-impact-refinement.md` §2 |

---

## 3. Tecnología (cuando aplique post-MVP)

| Tecnología | Uso | Justificación |
|---|---|---|
| **Three.js** | Núcleo de render | Base estable, control total de geometría, materiales y shaders |
| **React Three Fiber** | Integración React declarativa | Encaja con la arquitectura por componentes; facilita estados de cámara, cleanup y testing |
| **@react-three/drei** | Utilidades (controls, loaders) | **Selectivamente.** No importar helpers completos |
| **TopoJSON + Natural Earth** | Geometría `land` + `borders` (admin-0) | Ligero, topológicamente optimizado, abierto y trazable; permite LOD/decimation por breakpoint |
| **Shaders puntuales** | Fresnel atmosférico, foco de país | **Solo cuando aporten legibilidad.** Prohibido el uso decorativo |

### Alternativas descartadas

| Alternativa | Motivo | Decisión |
|---|---|---|
| **MapLibre GL JS** | Excelente en 2D/Web Mercator; no resuelve el relato de "globo terráqueo" | **Es la base natural del fallback 2D**, no del 3D |
| **Cesium** | Potente pero sobredimensionado: peso, complejidad y superficie de API mayores que el scope (becas por país, admin-0) | Descartado por mantenibilidad |
| **Spline** | Escenas opacas; difícil controlar LOD, DPR, raycast por país, a11y y `reduced motion`. Riesgo de pérdida de identidad | Descartado (`design/visual-direction.md`) |

---

## 4. Geometría real y mapeo de datos

| Elemento | Especificación | Razón |
|---|---|---|
| **Land** | TopoJSON Natural Earth admin-0, simplificado por LOD/breakpoint | Menos triángulos sin perder silueta reconocible |
| **Borders** | Líneas de frontera admin-0 delgadas con contraste suficiente | Legibilidad del país activo sin ruido decorativo |
| **Océanos** | Superficie tonal coherente con la paleta; no azul saturado genérico | Contexto sin competir con el acento |
| **Atmósfera** | Halo fresnel **muy sutil**, atenuado en móvil | Profundidad; nunca glow que sugiera cobertura |
| **Iluminación** | Direccional (Sol) **única** y estable | Legible, predecible, barato |
| **Fondo estelar** | Estrellas tenues y de baja densidad; desactivables con `reduced motion` | Profundidad sin romper jerarquía |
| **Mapeo** | **PAÍS ↔ geometría ↔ ISO 3166-1 ↔ becas verificables**, fuente única de verdad | Trazabilidad; sin ambigüedad de nombres |
| **Interacción** | **Raycast sobre el mesh del país**, no pins arbitrarios. Resaltado por contorno/tono | Precisión y honestidad geométrica |

**Principio:** la geografía sirve para **contextualizar cobertura verificable**, nunca para decorar.

---

## 5. UX del globo

**Flujo:** `PAÍS → OPORTUNIDADES` (el paso `PLANETA` es el overview inicial de la coropleta).

1. **Overview**: cámara centrada, rotación controlada. Muestra cobertura real; **no** colorea continentes vacíos.
2. **Selección de país**: transición a estado de cámara `country` (zoom suave, centrado, con padding). País sin datos → feedback honesto `sin oportunidades verificables`, no selectable con señal positiva.
3. **Detalle**: navegación al listado filtrado por ISO 3166. **Sin** modal superpuesto que oculte los gaps.

### Cámara

| Parámetro | Valor | Nota |
|---|---|---|
| **Auto-rotate** | Lenta, **pausable por toggle explícito** | Nunca forzada; respeta `prefers-reduced-motion` |
| **Damping** | Suave, fricción controlada | Sin rebotes ni sensación de juguete |
| **Zoom** | Min = overview global; Max = nivel país | Mantiene contexto |
| **Estados** | `overview` y `country`; transiciones cortas y funcionales | Comunican cambio de contexto, no espectáculo |
| **Gestos** | Drag, pinch, wheel con límites; velocidad diferenciada desktop/móvil | Coherente con UX touch-first |

### Jerarquía visual

- **País con becas**: acento cromático único dominante.
- **País sin datos**: estado neutro/mudo. Nunca interactivo con feedback positivo.
- **País activo**: contorno o borde sutil. **Máximo 1** activo.
- **Hover/focus**: solo en elementos interactivos, accesible por teclado.

---

## 6. Optimización

| Técnica | Aplicación | Objetivo |
|---|---|---|
| **LOD** | 2–3 niveles de geometría según distancia de cámara | Triángulos en overview, detalle al enfocar |
| **Decimation por breakpoint** | Simplificación distinta mobile/tablet/desktop | Agresivo en móvil sin perder silueta |
| **DPR cap** | `devicePixelRatio` limitado (1.75–2.0) | Evitar sobre-render en mid-range |
| **Texturas** | Sin mapas de entorno pesados; preferir materiales PBR/flat | Minimizar peso |
| **Lazy + dynamic** | `ssr: false`, import diferido del canvas | Nunca bloquea LCP |
| **Instancing** | Solo elementos repetibles (estrellas puntuales) | Reducir draw calls cuando aporte |
| **Dispose correcto** | Liberar geometrías/materiales/texturas al desmontar | Sin leaks en navegación SPA |
| **Progressive loading** | land low-poly → borders → extras | Estado `loading/progressive` |

**Targets FPS:** móvil mid-range **≥30 sostenido** (medido en navegación real, no idle). Desktop **40–60**.

**Protección:** si FPS <30 sostenido en móvil → **fallback 2D automático forzado**; el 3D no se habilita.

---

## 7. Fallback 2D

**El fallback 2D no es un plan B degradado: es la vista de geografía por defecto y canónica del MVP.**

| Aspecto | Especificación |
|---|---|
| **Default MVP** | Vista 2D (SVG/coropleth con TopoJSON) activa por defecto; globo desactivado conforme ADR-001 |
| **Coherencia visual** | Misma paleta, tipografía, spacing y shape language de `visual-direction.md`. Mismo lenguaje, no un look distinto |
| **Representación** | **Coropleth honesto**: solo países con becas verificables reciben acento; los demás neutros. Gaps visibles |
| **Interactividad** | Click/hover/focus por país, navegable por teclado, listado sincronizado (ISO 3166) |
| **Proyección** | Equilibrada, no distorsionadora. Legibilidad de país > estética |
| **Paridad funcional** | Oferta la misma funcionalidad de descubrimiento geográfico: filtros, estados, vacío |
| **Conmutación** | Detección de capacidad (GPU, DPR, FPS, `reduced motion`, memoria); conmutación bidireccional **sin perder estado** (país seleccionado, filtros) |

**Principio:** 2D es la expresión correcta del MVP (geografía para lookup). El 3D solo se justifica si añade valor medible (b) sin romper honestidad (d).

---

## 8. Accesibilidad

| Requisito | Especificación |
|---|---|
| **Alternativa no-3D obligatoria** | Siempre disponible y **equivalente**. Nunca depender exclusivamente del canvas |
| **Reduced motion** | Con `prefers-reduced-motion: reduce`: desactivar auto-rotate, transiciones y cámara decorativas, atenuar atmósfera/estrellas, preferir 2D o vista estática funcional |
| **Teclado** | Navegación completa por los países interactivos, activación con Enter/Espacio, salida de la vista. Focus visible y orden lógico |
| **Screen readers** | El canvas **no reemplaza semántica**. Proveer lista navegable de países con conteo de becas verificables y `aria-live` para cambios de estado. No leer geometría |
| **Contraste** | Estados distinguibles sin depender solo de color (patrón/tono distinto). AA |
| **Focus management** | En transición `overview → país`, conservar el foco de forma predecible; sin focus traps no deseados |
| **Touch targets** | ≥44×44 px en controles (toggle de rotación, conmutador 2D/3D) |

**Regla inamovible:** la experiencia no-3D debe ser usable, completa y preferible cuando hay restricciones de acceso o rendimiento.

---

## 9. Estados

| Estado | Comportamiento | Mensaje |
|---|---|---|
| **Loading** | Geometría ligera → bordes → resto. Skeleton no-3D | "Cargando mapa geográfico…" |
| **Progressive** | Placeholder 2D estático → swap a WebGL | Indicador sutil, sin spinner invasivo |
| **Empty** | Sin países con becas verificables | Explicar el estado sin sugerir error; ofrecer listado + filtros. **Nunca** representar globo completo |
| **Error** | Fallo al cargar TopoJSON o sin contexto WebGL | Mensaje accionable + **auto-fallback a 2D** + enlace a listado |
| **Reduced motion / sin WebGL** | Detección anticipada | Forzar 2D silenciosamente, sin molestar al usuario |
| **Offline / parcial** | Mostrar lo disponible con advertencia no bloqueante | Estado neutro; nunca inventa cobertura |

---

## 10. Métricas

| Métrica | Umbral | Cómo medir |
|---|---|---|
| **FPS móvil** | **≥30 sostenido** | Dispositivos objetivo mid-range, con rotación+zoom+selección (no idle) |
| **LCP** | No empeora **>10%** vs. fallback 2D | Web Vitals en la ruta de descubrimiento geográfico |
| **CLS** | **0** | Durante la carga progresiva (placeholder → canvas) |
| **Usable con reduced motion** | **100% funcional** | Test automático + manual |
| **Tiempo al primer frame** | <1.2 s, **sin bloquear TTI/LCP** | Red 3G/4G lento representativo |
| **Respuesta de interacción** | <100–150 ms | Selección con teclado/ratón/touch, sin animación decorativa de por medio |
| **Draw calls / triángulos** | Budget por breakpoint | Devtools, con revisión |
| **Tasa de fallback automático** | **0%** en pruebas objetivo | Si >0% por rendimiento → no habilitar 3D |
| **Cobertura representada vs. real** | **0%** de países sin datos con fill positivo | Assert automático de ISO ↔ becas |

---

## 11. Riesgos y gating

| Riesgo | Impacto | Prob. | Mitigación |
|---|---|---|---|
| **Ilusión de cobertura total** | Alto (confianza) | Media | Prohibido glow que uniforme vacíos; estados neutros; condición (d) |
| **Pérdida de claridad (decoración)** | Alto (UX) | Media-Alta | No es decoración: debe justificar valor medible (b) |
| **Degradación en móvil** | Alto | Media | DPR cap, LOD, decimation, fallback automático, budgets |
| **Pérdida de accesibilidad** | Alto | Baja-Media | Alternativa no-3D, reduced motion, teclado, SR semántico |
| **Pérdida de identidad visual** | Medio-Alto | Media | Coherencia estricta con `visual-direction.md`; nada de estética genérica |
| **Complejidad innecesaria** | Alto (mantenibilidad) | Media | Fuera de MVP por ADR-001; solo post-MVP con gating estricto |
| **Distorsión cognitiva (3D)** | Alto (lookup) | Media | Fallback 2D por defecto; validar (b) con tareas reales, no preferencia |
| **Licenciamiento de datasets** | Bajo-Medio | Baja | Natural Earth + TopoJSON propios; trazables a ISO 3166 |

### Checklist de gating (antes de habilitar post-MVP)

- [ ] ADR-001 respetado: MVP sin globo.
- [ ] (a) ≥500 registros verificables en ≥40 países.
- [ ] (b) Mejora medible vs. 2D (**test con usuarios**, no opinión).
- [ ] (c) FPS ≥30 móvil + fallback 2D robusto y conmutación segura probados.
- [ ] (d) 0% de fill positivo en países sin datos.
- [ ] Fallback 2D = DEFAULT y coherente con la identidad.
- [ ] A11y completo (reduced motion, teclado, SR, alternativa no-3D).
- [ ] No es decoración: propósito + memorabilidad justificados.
- [ ] Preserva claridad por encima de originalidad.
- [ ] Métricas de §10 dentro de umbral.
- [ ] Documentación actualizada si el gating cambia.

**Criterio final:** todas las casillas deben cumplirse simultáneamente. Si no, se descarta. La prudencia tiene prioridad sobre la ambición estética.

---

## Referencias cruzadas

- [`discovery/discovery.md`](../discovery/discovery.md) — §2.1 condiciones, §4.6 geografía vs. honestidad
- [`architecture/architecture.md`](../architecture/architecture.md) — rendimiento, lazy loading, resiliencia
- [`design/visual-direction.md`](../design/visual-direction.md) — identidad propia, sistema visual
- [`ux/ux-strategy.md`](../ux/ux-strategy.md) — flujos, estados, a11y-first
- [`data-strategy/data-strategy.md`](../data-strategy/data-strategy.md) — verificabilidad, ISO 3166, calidad de datos
- [`value-impact/value-impact-refinement.md`](../value-impact/value-impact-refinement.md) — impacto medible, gating por evidencia
- `ADR-001` — decisión de alcance del MVP
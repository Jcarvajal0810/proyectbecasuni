# Estado del proyecto

- Proyecto: Buscador de becas internacionales con globo 3D (becasuapp)
- Modo: interactivo
- Fase actual: 6 Implementación — E0 en curso: proyecto Lovable creado (f8d0600d-…); delta TanStack aprobado; knowledge guardado; pendiente: conectar proyecto a GitHub → E1a
- Plan aprobado por el usuario: sí (2026-09-29)

## Fases del plan propuesto (marcar [x] al cerrar)
- [x] 0 Discovery
- [x] 1 Value (ligera)
- [x] 2 Architecture (ligera)
- [x] 3 UX/UI Strategy
- [x] 4 Visual Direction (crítica)
- [x] 5 Blueprint
- [ ] 6+7 Implementation + Integration
- [ ] 8 Audit
- [ ] 9 Corrections
- [ ] 11 Legal (ligera)
- [ ] 12 Documentation
- [ ] 13 Final Verification
(10 Maintenance omitida: proyecto nuevo sin deuda)

## Último checkpoint
FASE: 3 UX/UI Strategy + 4 Visual Direction
OBJETIVO: estrategia UX (flujos, estados, accesibilidad, eventos) y dirección visual concreta para el brief a Lovable
AGENTES: design-strategist, design-director, architect (validación R9), database (migración campos UX)
SKILLS: designing-user-experience, designing-frontend-interfaces, building-accessible-interfaces, connector-advisor
HALLAZGOS: huecos del contrato de datos (publicada_el, idioma, periodo de monto) → resueltos por migración; globo filtrado aprobado con condiciones; contrastes y fuentes verificados
DECISIONES: DESIGN_STRATEGY 1-11 y VISUAL_DIRECTION aprobadas; Figma no; reportes vía Google Forms; config 30/120 aplicada
RIESGOS: Lovable con estilos por defecto (Inter, Card, gradientes) → brief literal + get_diff; API de materiales de react-globe.gl; verde/ocre similares en deuteranopía (texto+icono obligatorios); globo vacío en temporada baja; ISO_A2=-99 en GeoJSON
CAMBIOS: .project/DESIGN_STRATEGY.md, VISUAL_DIRECTION.md; supabase/migrations/20260930100000_campos_ux_fase3.sql aplicada
SIGUIENTE FASE: 5 Blueprint (PROJECT_BLUEPRINT.md: brief por pantallas para Lovable, contrato de datos, eventos, spike del globo, orden de construcción, formulario Google Forms)

## Conectores
| Capa | Conector | Estado (propuesto / aprobado / descartado / conectado) | Alcance | Dueño del código |
|---|---|---|---|---|
| Datos/backend | Supabase propio (+ MCP limitado) | **conectado** (2026-09-29): org "becasu" (free), proyecto existente "Jcarvajal0810's Project" ref `zmseqixhtciqylprfrfh`, us-east-1, vacío al conectar. MCP acotado `?project_ref=…&features=database,debugging,development,docs` (requiere reinicio para aplicar) | solo este proyecto; migraciones revisadas con confirmación | database (esquema/RLS/vistas/migraciones), Lovable (cliente anon), security audita |
| Hosting | Lovable (Vercel descartado) | aprobado | publicación desde Lovable | Lovable |
| UI | Lovable | **conectado**; proyecto becasu f8d0600d-14be-440c-aa99-64a74b757de7 (editor https://lovable.dev/projects/f8d0600d-14be-440c-aa99-64a74b757de7) | UI completa (writer único de UI) | Lovable escribe; frontend integra y audita |
| Errores | Sentry | descartado (usuario) | — | — |
| Errores + analytics | PostHog | **conectado** (2026-09-29, proyecto 636672 "Default project", replay OFF; anonymize_ips OFF → revisar en Fase 11) | errores + analítica de producto, SIN session replay | frontend (SDK vía brief a Lovable), reliability (errores), value-impact (métricas) |
| Diseño | Figma | descartado (usuario, Fase 3) | — | — |
| Reportes de error | Google Forms | aprobado (enlace prellenado, sin SDK) | formulario externo | usuario crea; Lovable enlaza |
| Analytics | PostHog (cubre esta capa) | aprobado | ver fila PostHog | — |
| Repo | GitHub | MCP falló; **vía integración nativa de Lovable, repo privado creado por Lovable → renombrar a becasup** (aprobado) | sync Lovable ↔ repo | Lovable (UI), agentes vía PR con confirmación |

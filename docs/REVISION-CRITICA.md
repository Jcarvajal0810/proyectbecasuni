# Revisión crítica del documento original

## Lo que está muy bien (se conserva)
- "Valor antes que tecnología", "simplicidad primero" y "no usar todos los agentes": son la protección contra el sobre-diseño.
- Auditores que distinguen bug real / riesgo / mala práctica / opcional.
- Pasar contexto completo a cada agente y registrar decisiones.
- El anti-generic check y las preguntas de la firma visual.
- Formato de opciones A/B para tecnologías, sin rankings.

## Lo que simplifiqué y por qué
1. **18 agentes es demasiado para casi cualquier proyecto** (más superficie de prompts que mantener, más coste de contexto, más riesgo de solapamiento). Fusioné: `@patterns` y `@replication` → dentro de `architect`; los dos de orquestación → la sesión principal. Quedan 14 subagentes, y en la práctica un proyecto pequeño usa 4-6.
2. **13 fases fijas es mucho** para proyectos chicos; el propio documento dice que son dinámicas, así que `/project-plan` debe fusionarlas (p. ej. 1+2, 3+4) cuando el proyecto sea pequeño.
3. **Fase 3 y 4 (estrategia + dirección visual) en dos agentes Opus** son caras y solo se justifican si la identidad visual es un diferenciador. Para una herramienta interna, una sola pasada basta.
4. **Modo automático:** sin aprobación humana en fases 2-5 corres el riesgo de propagar una mala decisión a toda la implementación. Recomiendo activarlo solo tras aprobar blueprint.

## Riesgos y huecos
- **Paralelizar escritura** en el mismo repo sigue siendo riesgoso aunque haya "un escritor por área": fronteras difusas (tipos compartidos, contratos de API). Añadir en el blueprint un contrato de API explícito.
- **Catálogo tecnológico (secc. 5-6) envejece rápido.** Por eso la skill `connector-advisor` obliga a verificar precios, límites y disponibilidad actuales.
- **Falta un criterio de "proyecto pequeño":** añadí en el comando que se puedan omitir fases con justificación.
- **Conectores con lock-in** (generadores de UI, BaaS): el documento pide explicar lock-in, pero falta decidir *quién es dueño del código*; lo agregué en `connector-advisor`.
- **Sección 6 no incluía generadores de UI** (Lovable y similares), justo lo que querías; ahora hay una categoría propia.

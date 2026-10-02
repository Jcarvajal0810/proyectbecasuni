---
description: Ejecuta la siguiente fase del plan aprobado, escribe el checkpoint y pide aprobación cuando corresponde
---

1. Lee `.project/state.md` y `.project/decisions.md`. Si el plan no está aprobado, detente y sugiere `/project-plan`.
2. Identifica la siguiente fase pendiente y qué agentes/skills le tocan según el plan.
3. Delega a los subagentes pasando: objetivo, requisitos, decisiones previas, restricciones y resultados relevantes de fases anteriores. Paraleliza solo tareas independientes; un solo escritor por área.
4. Guarda el entregable de la fase en `.project/` y actualiza `state.md` con el checkpoint (FASE, OBJETIVO, AGENTES, SKILLS, HALLAZGOS, DECISIONES, RIESGOS, CAMBIOS, SIGUIENTE FASE) y `decisions.md`.
5. Recoge los `CONNECTOR PROPOSALS` de los agentes (y los que veas tú) y, con la skill `connector-advisor`, pregunta directamente al usuario si quiere integrarlos (una sola ronda de preguntas). Si acepta, ejecuta `/project-connect`.
6. Muestra decisiones y riesgos. Si la fase es de arquitectura, dirección visual o alcance funcional: **espera aprobación** antes de seguir. Si no, propone la siguiente fase.

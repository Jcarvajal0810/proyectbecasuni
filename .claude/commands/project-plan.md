---
description: Fase 0 — analiza la idea, propone fases, agentes, skills y conectores, y pide aprobación (modo plan, no modifica código)
argument-hint: <descripción de lo que quieres construir>
---

Idea del usuario: $ARGUMENTS

Actúa como project-manager. NO escribas código. Lee `.project/state.md`, `.project/decisions.md` y la estructura del proyecto si ya existe. Si la idea es demasiado vaga, haz UNA pregunta clave; si no, asume y declara supuestos.

Entrega, en este orden:
1. "Entendí el producto así…" (resumen, problema, usuarios, objetivo, funcionalidades conocidas, restricciones, supuestos, riesgos)
2. "Propongo estas fases…" (solo las necesarias; justifica las que omites)
3. Agentes y skills por fase, con la razón de cada uno
4. Conectores/integraciones **por capa** (UI, backend, datos, auth, pagos, hosting, observabilidad… solo las que apliquen). Usa la skill `connector-advisor`: para cada una, sugerencia + alternativa (incluida "sin servicio externo") y luego **pregunta directamente si quiero que lo integre** (sí / sí limitado / alternativa / no). Agrupa las preguntas en una sola ronda.
5. Métricas de éxito propuestas
6. Pide aprobación explícita del plan.

Al aprobarse, actualiza `.project/state.md` (plan aprobado: sí, fases del plan).

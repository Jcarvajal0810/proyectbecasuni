---
description: Fase 8 — lanza auditorías en paralelo (quality, security, reliability) sobre la implementación real y asigna los hallazgos
---

Lanza en paralelo los subagentes `quality`, `security` y `reliability` (y `legal` si aplica) sobre el código real, con el blueprint como referencia. Aplica también la skill `reviewing-interface-quality` a la UI.
Consolida los hallazgos por severidad y asigna cada uno al especialista que corrige (frontend→frontend, backend→backend, datos→database, refactor→maintenance, seguridad→implementador + re-auditoría de security). Los auditores no editan. Actualiza `.project/state.md`.

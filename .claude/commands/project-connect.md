---
description: Integra un conector/servicio aprobado por el usuario (MCP o plugin), lo verifica y actualiza el pipeline
argument-hint: <conector> [capa]
---

Conector a integrar: $ARGUMENTS

Solo ejecuta esto si el usuario ya dijo que sí (en esta conversación o en `.project/decisions.md`). Si no, primero haz la pregunta directa de la skill `connector-advisor`.

1. Verifica la vía de conexión vigente (docs oficiales del servicio; `claude mcp list` para ver lo ya conectado). No inventes URLs.
2. Alcance mínimo: proyecto de desarrollo, solo lectura si alcanza, secretos por variables de entorno.
3. Conecta (`claude mcp add ...` o `/plugin install ...`), indica al usuario el paso de autenticación si es manual (`/mcp`), y comprueba con `claude mcp list` y una acción de bajo riesgo.
4. Registra en `.project/state.md` (tabla Conectores) y `.project/decisions.md`.
5. Explica cómo cambia el reparto de trabajo entre agentes (tabla de la skill) y ajusta las próximas delegaciones.

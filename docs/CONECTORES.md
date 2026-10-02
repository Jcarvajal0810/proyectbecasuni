# Conectores: cómo funciona en este sistema

## Comportamiento esperado
En cada fase donde se decide una capa (UI, backend, datos, auth, pagos, hosting…), Claude:
1. **Detecta** si un servicio externo aporta valor real para ESE proyecto.
2. **Verifica** que exista y esté vigente (MCP/plugin oficial, planes, límites).
3. **Sugiere** una opción + una alternativa (incluida "sin servicio externo") con ventajas, desventajas, lock-in y cuándo NO usarla.
4. **Pregunta directamente**: "¿Quieres que integre X para <capa>?" → sí / sí limitado / alternativa / no.
5. Si dices que sí: `/project-connect` lo conecta, lo verifica, lo registra y ajusta qué agente escribe qué.

Ejemplo de conversación:
> Para el **frontend** te sugiero Lovable: te da un prototipo funcional rápido a partir de tu `VISUAL_DIRECTION.md`. Contras: créditos y lock-in; no lo uses si tu identidad visual propia es el diferenciador. Alternativa: que `@frontend` lo implemente directo.
> Para **datos y auth** te sugiero Supabase (Postgres + auth + storage). Alternativa: Postgres propio + auth casera.
> ¿Quieres que integre alguno? (Lovable: sí/limitado/no · Supabase: sí/limitado/no)

## Conexión en Claude Code (verificados en fuentes consultadas)
```bash
claude mcp add --transport http lovable "https://mcp.lovable.dev"            # o /plugin install lovable@claude-plugins-official
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp"
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
# Stripe: servidor remoto https://mcp.stripe.com (probar en sandbox)
# Sentry: npx @sentry/mcp-server@latest (con token)
claude mcp list        # ver lo conectado; /mcp para autenticar
```
El resto de categorías está en `.claude/skills/connector-advisor/catalog.md`, marcadas como "comprobar antes" cuando no las pude verificar.

## Seguridad
Cada servidor MCP es un límite de permisos nuevo: entorno de desarrollo primero, permisos mínimos, solo lectura si alcanza, secretos en variables de entorno (`${VAR}` en `.mcp.json`), y confirmación tuya para acciones de escritura externas (migraciones, publicar, cobrar, crear PRs).

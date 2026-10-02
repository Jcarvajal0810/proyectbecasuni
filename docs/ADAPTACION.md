# Adaptación del sistema a Claude Code

## Mapeo de conceptos
| En tu documento | En Claude Code | Dónde vive |
|---|---|---|
| Agentes (@architect, @backend…) | Subagentes | `.claude/agents/*.md` |
| @project-manager y @project-orchestrator | La **sesión principal** + reglas | `CLAUDE.md` + `/project-plan`, `/project-next` |
| Skills de diseño | Skills | `.claude/skills/*/SKILL.md` |
| Fases y checkpoints | Archivos de estado + comandos | `.project/state.md`, `decisions.md` |
| Modo interactivo / plan / automático | Plan mode + comandos | `/project-plan` (plan), `/project-next` (interactivo); automático = encadenar fases tras aprobación |
| Conectores / servicios | Servidores MCP y plugins | `claude mcp add …` / `/plugin` (ver `CONECTORES.md`) |
| Regla "un escritor por área" | Permisos de `tools` por subagente | campo `tools:` de cada agente |

## Decisiones de adaptación (y alternativas)
1. **PM y orquestador no son subagentes.** Un subagente no puede lanzar a otros, así que quien reparte el trabajo debe ser la sesión principal. Alternativa descartada: un subagente "orchestrator" (no podría delegar).
2. **Estado en archivos, no en memoria.** Cada sesión empieza leyendo `.project/state.md`. Simple, versionable en git, revisable por ti.
3. **Auditores de solo lectura** (`tools: Read, Grep, Glob`); solo los especialistas tienen Edit/Write. Así se cumple la regla de no editar a la vez.
4. **Paralelismo:** se pide en el prompt ("lanza estos subagentes en paralelo") solo para tareas independientes; diseño → dirección → frontend va en serie.
5. **Checkpoints interactivos:** el comando termina y espera tu respuesta; no hay mecanismo especial, es una regla de `CLAUDE.md`.

## Instalación
Copia `CLAUDE.md`, `.claude/` y `.project/` a la raíz de tu proyecto (o `.claude/agents` y `.claude/skills` a `~/.claude/` para usarlos en todos). Reinicia Claude Code o ejecuta `/agents` para comprobar que aparecen.

## Prueba antes de usarlo en serio (tu punto 12)
Proyecto de juguete sugerido: una lista de tareas con login. Ejecuta `/project-plan una app de tareas con login` y comprueba que (a) NO escribe código, (b) propone solo las fases necesarias, (c) pide aprobación, (d) `/project-next` deja checkpoints legibles. Ajusta agentes/skills según lo que veas.

## Lo que no pude verificar
La sintaxis exacta de frontmatter, comandos y plugins cambia entre versiones de Claude Code: valida con `/agents`, `/help` y la documentación oficial antes de darlo por bueno. Los modelos por agente (`opus`/`sonnet`/`haiku`) son una propuesta de coste/calidad, ajústalos.

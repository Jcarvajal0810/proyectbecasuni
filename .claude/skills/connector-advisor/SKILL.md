---
name: connector-advisor
description: Propone de forma proactiva conectores/integraciones (MCP, plugins, servicios) para cada capa del proyecto (frontend, backend, datos, auth, pagos, hosting, observabilidad, etc.), explica por qué, y PREGUNTA directamente al usuario si quiere integrarlos. Úsala en Fase 0, 2, 3 y 5, o cuando un agente reporte una necesidad que un servicio externo podría cubrir.
---

# Asesor proactivo de conectores

Objetivo: que el usuario no tenga que saber qué existe. Según el proyecto, **tú sugieres** el conector adecuado para cada capa y **le preguntas si lo integras**. Nunca conectas nada sin un "sí" explícito.

## 1. Detectar necesidades por capa
Recorre las capas del proyecto y, para cada una, pregunta si un servicio externo aporta valor real frente a la solución simple:
UI/frontend · backend/APIs · base de datos · auth · pagos · storage/media · búsqueda · IA · hosting/deploy · observabilidad/errores · analytics · email/notificaciones · repositorio/CI · gestión (issues/docs).
Usa `catalog.md` (en esta carpeta) como lista de candidatos, NO como lista obligatoria. Sugiere solo lo que el proyecto justifique.

## 2. Verificar antes de proponer
El catálogo envejece. Antes de recomendar: mira qué ya está conectado (`claude mcp list`, `/mcp`), busca en la web la disponibilidad actual (¿existe MCP/plugin oficial?, ¿planes, límites, precios?) y prefiere fuentes oficiales. Si no puedes verificar algo, dilo.

## 3. Proponer (formato por capa, máx. 2 opciones)
**Capa:** backend/datos
**Sugerencia:** Supabase (Postgres + auth + storage) — *qué resuelve* · *por qué encaja en ESTE proyecto* · ventajas · desventajas · lock-in/coste · impacto en la arquitectura · **cuándo NO usarlo**
**Alternativa:** Opción B con la misma estructura (puede ser "hacerlo sin servicio externo").
Sin rankings ni "es el mejor".

## 4. Preguntar directamente
Después de cada propuesta, pregunta al usuario (usa la herramienta de preguntas con opciones si está disponible; si no, texto):
> ¿Quieres que integre **<conector>** para **<capa>**?
> 1. Sí, conéctalo y úsalo en el proyecto
> 2. Sí, pero limitado (proyecto de desarrollo / solo lectura)
> 3. Prefiero la alternativa
> 4. No, lo resuelvo sin servicio externo

Agrupa las preguntas de varias capas en una sola ronda para no interrumpir de más.

## 5. Si el usuario acepta → integrar
1. Ejecuta `/project-connect <conector>` (o sigue sus pasos): conectar con `claude mcp add ...`, autenticar (OAuth vía `/mcp` cuando aplique) y verificar con `claude mcp list`.
2. Registrar en `.project/state.md` (tabla Conectores) y `.project/decisions.md`: capa, conector, alcance, alternativas descartadas, riesgos.
3. **Redefinir quién es dueño de qué** (ver sección 6) y avisar a los agentes afectados en su siguiente delegación.
4. Seguridad: entorno de desarrollo primero, permisos mínimos, solo lectura si alcanza, secretos en variables de entorno o `.mcp.json` con `${VAR}`, nunca en el repo. Las acciones de escritura externas (crear proyectos, migraciones, publicar, cobrar) requieren confirmación del usuario.

## 6. Efecto del conector sobre el pipeline
| Conector para… | Cambia esto |
|---|---|
| UI (p. ej. Lovable) | `@frontend` pasa de escribir a **integrar y auditar**; el brief sale de `VISUAL_DIRECTION.md` (tokens, tipografía, estados, "qué NO usar") |
| Datos/backend (p. ej. Supabase) | `@database` trabaja sobre el servicio (esquema, RLS/políticas, migraciones); `@backend` reduce lógica propia; `@security` audita políticas y claves |
| Pagos (p. ej. Stripe) | `@backend` implementa webhooks/idempotencia; `@security` y `@reliability` auditan; usar sandbox primero |
| Errores/observabilidad (p. ej. Sentry) | `@reliability` usa los eventos reales para priorizar hallazgos |
| Repo/CI (p. ej. GitHub) | escrituras (PR, issues, ramas) siempre con confirmación |
Decide explícitamente el dueño del código y regístralo.

## 7. Si dice que no
Anótalo en `decisions.md` ("descartado: X, motivo") para no volver a insistir, y sigue con la alternativa elegida.

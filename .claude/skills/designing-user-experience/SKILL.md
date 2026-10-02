---
name: designing-user-experience
description: Flujos, arquitectura de interacción, estados (empty/loading/error/partial), feedback y recuperación. Úsala al diseñar o implementar cualquier flujo o componente interactivo.
---

# Diseño de experiencia de usuario

Prioridades: claridad, facilidad, velocidad, reducción de errores, feedback, recuperación, accesibilidad, confianza.

Principio: **un componente no está terminado si solo funciona en el estado ideal.** Define para cada pantalla/componente: default, hover, focus, active, loading, empty, error, success, partial, disabled, processing y offline (si aplica).

Para cada flujo responde: ¿qué quiere lograr la persona?, ¿cuál es el camino más corto?, ¿qué pasa cuando falla?, ¿cómo se recupera?, ¿qué feedback recibe en cada paso?

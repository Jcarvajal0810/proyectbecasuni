---
name: building-accessible-interfaces
description: Accesibilidad WCAG: semántica, teclado, focus, ARIA, contraste, live regions y reducción de movimiento. Úsala al implementar o revisar cualquier UI.
---

# Interfaces accesibles

- HTML semántico primero; ARIA solo cuando el HTML nativo no alcanza.
- Todo operable con teclado, con orden de tabulación lógico y focus visible.
- Contraste suficiente (WCAG AA como mínimo) y no depender solo del color.
- Live regions para cambios dinámicos (errores, resultados, carga).
- Respetar `prefers-reduced-motion`; el motion nunca es la única vía de información.
- Formularios: labels asociados, errores claros y vinculados al campo.

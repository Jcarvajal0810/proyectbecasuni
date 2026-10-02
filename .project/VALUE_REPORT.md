# VALUE REPORT — Fase 1 (ligera) · 2026-09-29
Agente: value-impact · Estado: **pendiente de aprobación del usuario**

## Cadena de valor
- **Problema:** becas dispersas en cientos de sitios oficiales; agregadores con datos vencidos y sin fecha de verificación. Horas perdidas para saber si una beca sigue abierta y si se es elegible. *(Supuesto: validar con 5-8 entrevistas.)*
- **Persona (supuesto):** estudiante/egresado latinoamericano (sobre todo colombiano) buscando posgrado o intercambio. Secundaria: orientadores de movilidad / relaciones internacionales.
- **Necesidad real:** "qué becas puedo pedir ahora, dónde, y si me sirven" (abierta/cerrada, elegibilidad, cobertura, enlace oficial). Secundaria: explorar destinos.
- **Solución:** catálogo curado y verificado + exploración por país (globo) + filtros + enlace oficial.
- **Valor:** confianza (datos reales, verificación, estado automático); ahorro de tiempo; descubrimiento visual.
- **Diferenciador defendible:** veracidad y frescura (+ elegibilidad para latinoamericanos si se confirma). El globo diferencia en memorabilidad, no en utilidad.

## Globo 3D
Puerta de entrada, no único camino. Malo para comparar/filtrar (solapamiento en Europa, precisión táctil). Con intención clara, filtros deben llegar en menos pasos. Hipótesis PostHog: conversión a `official_url_clicked` por globo vs lista; si el globo no convierte, no se invierte más en él.

## Alcance MVP
**Entra:** globo (abiertas + "cierra pronto") con fallback y ruta accesible · lista/buscador equivalente · ficha con campos mínimos + URL oficial + fecha de verificación · filtros (nivel, área, cobertura, idioma, estado; cerradas ocultas + "Ver cerradas") · nacionalidad elegible (o "consultar convocatoria") · estado automático + badge "cierra pronto" · orden por deadline · eventos PostHog · página "cómo verificamos" · botón "reportar error" · español primero.

**Fuera (post-MVP, condicionado a datos):** cuentas, favoritos, alertas por correo · scraping · IA/emparejamiento · comparador, calculadora, montos normalizados · solicitudes en la app, comunidad · panel admin sofisticado · monetización · multi-idioma.

## Catálogo inicial
Sin cifra fija: lo define la **capacidad de mantenerlo verificado** + prueba con 5-8 perfiles reales. Cobertura primero de destinos frecuentes (hipótesis: EE. UU., Canadá, Reino Unido, Alemania, España, Francia, Países Bajos, Australia, Japón, Corea del Sur, Erasmus Mundus) y becas abiertas a latinoamericanos. Medir catálogo **"abierto hoy"**, no total; sembrar según calendario de convocatorias; usar "próxima convocatoria" con fuente.

## Campos mínimos por beca
Nombre y oferente · país(es) destino (multi-país) · nivel · área(s) · cobertura total/parcial (+ monto solo si es oficial con moneda) · requisitos clave (nacionalidades elegibles o "consultar", idioma/certificación, nivel previo; 3-4 líneas) · fecha límite (+ próxima convocatoria con fuente) · URL oficial · verificado el (+ quién, opcional).

## Retorno
"Qué se abrió / qué cierra pronto": orden por deadline, secciones "cierran pronto" y "nuevas/actualizadas", filtros en la URL, compartir por enlace/WhatsApp. Confianza acumulada (un dato roto cuesta más que cien aciertos).

## Métricas (PostHog; umbrales a definir con línea base)
Eventos: `session_start` (origen), `globe_loaded`, `globe_fallback_shown` (motivo), `globe_country_selected`, `list_view_opened`, `search_used`, `filter_applied`, `show_closed_toggled`, `scholarship_viewed`, `official_url_clicked`, `share_clicked`, `verification_page_viewed`, `empty_results_shown`, `report_error_clicked`.
- **Estrella:** % sesiones con `official_url_clicked`; tiempo hasta ese clic.
- Activación: % sesiones con `scholarship_viewed`.
- Globo vs lista: adopción y conversión.
- Calidad de datos: `empty_results_shown`, reportes de error, % becas con verificación vencida.
- Rendimiento: tasa de fallback por dispositivo.
- Retención 7/30 días; llegada por enlaces compartidos.
- Opcional: encuesta de una línea tras clic oficial.

## Decisiones propuestas
1. Métrica estrella = sesiones con `official_url_clicked`.
2. Globo = puerta de entrada; lista igual de rápida; inversión condicionada a conversión.
3. Nacionalidad elegible e idioma como datos de primer nivel ("consultar convocatoria" si no verificable).
4. Tamaño de catálogo por capacidad de verificación + prueba de perfiles.
5. Retención sin cuentas (deadline, cierran pronto, nuevas, filtros en URL, compartir).
6. Botón "reportar error" desde el MVP.
7. Español primero.
8. Fuera del MVP: IA, comparador, montos normalizados, comunidad, solicitudes, monetización.

## Riesgos
Mantenimiento manual (sin curador, se pierde la ventaja) · globo vacío en meses con pocas convocatorias abiertas · persona no validada · globo compitiendo con la utilidad · elegibilidad mal interpretada · sostenibilidad sin monetización · legal ligero (nombres/logos de entidades, enlaces).

# supabase/

## Migraciones (orden)
1. `20260930012834_esquema_inicial.sql`: enums, tablas (`config`, `pais`, `area`, `institucion`, `beca`, N:M, `convocatoria`), triggers (`updated_at`, validación IANA de `deadline_tz`), helper `deadline_fin_del_dia`, índices.
2. `20260930012848_rls_y_grants.sql`: RLS en todas las tablas; `anon`/`authenticated` solo SELECT; becas e hijas solo si `estado_revision = 'publicada'`.
3. `20260930012907_vistas_publicas.sql`: `becas_publicas`, `beca_detalle`, `paises_con_becas` (todas `security_invoker`). Aquí se deriva el estado.
4. `20260930012957_seed_catalogos.sql`: `config`, `area`, 249 países ISO 3166-1. Sin becas.
5. `20260930100000_campos_ux_fase3.sql`: `publicada_el` (trigger), `idiomas_requeridos`, `certificacion_idioma`, `monto_periodo` (enum `periodo_monto`), vistas con columnas nuevas al final (`beca_detalle` recreada), umbrales config 30/120.

## Cómo curar datos (Table Editor, rol postgres)
Orden: `institucion` -> `beca` (en `borrador`) -> N:M (`beca_pais_destino`, `beca_nivel`, `beca_area`, `beca_nacionalidad_elegible`) -> `convocatoria` -> pasar `estado_revision` a `publicada`.
- `url_oficial` y `url_fuente` son https y obligatorias; `verificado_el` obligatorio.
- Monto solo con cifra oficial, `moneda` (ISO 4217) y `monto_periodo` (`mensual`, `anual`, `total`, `unico`): los tres van juntos o ninguno. Si no: `tipo_cobertura` + `cobertura_detalle` literal de la fuente.
- Idioma: `idiomas_requeridos` = códigos ISO 639-1 en minúscula (`{en}`, `{en,es}`); `{}` = sin dato verificado (la UI muestra "consultar convocatoria"). `certificacion_idioma` = texto literal de la fuente ("IELTS 6.5"), vacío si no se especifica. `idioma_requisito` queda solo como nota libre (legado).
- `publicada_el` es automático: se fija la primera vez que `estado_revision` pasa a `publicada` y no se borra al retirar. No lo edites a mano.
- Fecha solo con día: `deadline_at = public.deadline_fin_del_dia('2026-12-15','Europe/London')`, `deadline_solo_fecha = true`. Con zona desconocida deja `deadline_tz` vacío: se usa UTC+14 (cierra antes) y el trigger marca `requiere_revision = true`.
- Nunca registres fechas futuras sin fuente. Una convocatoria con `apertura_at` futuro solo se muestra como "próxima apertura".
- Para retirar una beca usa `estado_revision = 'retirada'` (no borrar).
- `nacionalidad_abierta_a_todas = true` implica no llenar `beca_nacionalidad_elegible` (no lo impone la BD).

## Reglas de estado (se calculan al leer, con now(); sin cron)
Convocatoria vigente: fija con deadline futuro (la más próxima) > rolling > por_confirmar > última fija pasada.
- `cerrada`: deadline pasado. `cierra_pronto`: faltan menos de `config.dias_cierra_pronto` (30, aprobado Fase 3). `abierta`: el resto.
- `rolling`: `abierta` solo si la verificación (la más antigua entre beca y convocatoria) está dentro de `config.dias_verificacion_antigua` (120, aprobado Fase 3); si no, `por_confirmar`.
- Sin convocatoria vigente o tipo `por_confirmar`: `por_confirmar`. Ni `por_confirmar` ni `cerrada` iluminan el globo.
- `paises_con_becas.n_abiertas` cuenta abiertas + cierra_pronto; `n_cierra_pronto` es el subconjunto.
- Para cambiar umbrales: `update public.config set valor = '21' where clave = 'dias_cierra_pronto';`

## Seguridad y convenciones
- Columnas privadas: `beca.verificado_por`, `convocatoria.notas` y `convocatoria.requiere_revision` no tienen GRANT para anon/authenticated (grants por columna). `select=*` sobre `beca` o `convocatoria` falla para anon: la app debe usar `becas_publicas`, `beca_detalle` y `paises_con_becas`.
- Funciones nuevas en `public`: revoke explícito (`revoke execute on function ... from public, anon, authenticated;`). Los default privileges cubren objetos creados por `postgres`; los creados por `supabase_admin` conservan los defaults de Supabase.
- `institucion` solo es visible si tiene al menos una beca publicada. `config` solo expone `dias_cierra_pronto` y `dias_verificacion_antigua` (enteros de 1 a 4 dígitos).
- URLs: https, con host con punto, sin espacios (`@` no permitido en el host), máximo 2048 caracteres.
- `verificado_el` no puede ser futuro (tolerancia de 1 día por husos).
- Para dar de baja una beca usa `estado_revision = 'retirada'`; no borres filas.

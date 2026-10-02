-- 20260930100000_campos_ux_fase3.sql
-- Cambios de datos aprobados en Fase 3 (DESIGN_STRATEGY punto 11):
--  a) beca.publicada_el (automatico, para "nuevas")
--  b) idiomas_requeridos (ISO 639-1) + certificacion_idioma
--  c) monto_periodo (enum periodo_monto)
--  e) umbrales definitivos en public.config (30 / 120)
-- Sin perdida de datos: ADD COLUMN, un DROP VIEW (beca_detalle, se recrea) y UPDATE de config.
-- Nota: si ya existieran becas con monto no nulo, el check beca_monto_periodo_juntos
-- fallaria al crearse; rellena monto_periodo antes (ver README).

-- ---------------------------------------------------------------------------
-- Tipos y columnas
-- ---------------------------------------------------------------------------
create type public.periodo_monto as enum ('mensual', 'anual', 'total', 'unico');

alter table public.beca
  add column publicada_el          timestamptz,
  add column idiomas_requeridos    char(2)[] not null default '{}',
  add column certificacion_idioma  text,
  add column monto_periodo         public.periodo_monto;

-- ISO 639-1 en minusculas; sin elementos nulos. Array vacio = sin dato.
alter table public.beca add constraint beca_idiomas_requeridos_iso639
  check (
    array_position(idiomas_requeridos, null::char(2)) is null
    and array_to_string(idiomas_requeridos, ',') ~ '^([a-z]{2}(,[a-z]{2})*)?$'
  );

alter table public.beca add constraint beca_certificacion_idioma_no_vacia
  check (certificacion_idioma is null or length(btrim(certificacion_idioma)) > 0);

-- monto y monto_periodo van juntos (monto ya exige moneda por beca_monto_moneda_juntos).
alter table public.beca add constraint beca_monto_periodo_juntos
  check ((monto is null) = (monto_periodo is null));

comment on column public.beca.idioma_requisito is
  'Nota libre de idioma (legado, compatibilidad). El dato estructurado es idiomas_requeridos + certificacion_idioma.';
comment on column public.beca.idiomas_requeridos is
  'Codigos ISO 639-1 en minuscula (p. ej. {en,es}). Array vacio = sin dato: la UI muestra "consultar convocatoria".';
comment on column public.beca.certificacion_idioma is
  'Texto literal de la fuente oficial (p. ej. "IELTS 6.5"). Null = no especificada.';
comment on column public.beca.monto_periodo is
  'Periodo al que se refiere monto: mensual, anual, total o unico. Obligatorio si hay monto.';
comment on column public.beca.publicada_el is
  'Primera vez que estado_revision paso a publicada (automatico, no se borra al retirar).';

-- ---------------------------------------------------------------------------
-- publicada_el automatico
-- ---------------------------------------------------------------------------
create function public.beca_fijar_publicada_el()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Nunca se borra ni se reemplaza una vez fijada (tampoco al retirar).
  if tg_op = 'UPDATE' and old.publicada_el is not null then
    new.publicada_el := old.publicada_el;
  elsif new.estado_revision = 'publicada' and new.publicada_el is null then
    new.publicada_el := pg_catalog.now();
  end if;
  return new;
end;
$$;

revoke execute on function public.beca_fijar_publicada_el() from public, anon, authenticated;

create trigger beca_fijar_publicada_el before insert or update on public.beca
  for each row execute function public.beca_fijar_publicada_el();

-- Becas ya publicadas (si las hay): aproximacion con created_at.
update public.beca set publicada_el = created_at
 where estado_revision = 'publicada' and publicada_el is null;

-- ---------------------------------------------------------------------------
-- Grants por columna (no cubren columnas nuevas automaticamente)
-- ---------------------------------------------------------------------------
grant select (publicada_el, idiomas_requeridos, certificacion_idioma, monto_periodo)
  on public.beca to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Vistas (security_invoker). Columnas nuevas AL FINAL de becas_publicas.
-- beca_detalle usa bp.* y agrega columnas propias: se recrea (drop + create).
-- paises_con_becas no depende de las columnas nuevas y no se toca.
-- Logica de estado identica a 20260930012907 (ver comentarios alli).
-- ---------------------------------------------------------------------------
create or replace view public.becas_publicas
with (security_invoker = true) as
with cfg as (
  select
    now()                                   as ahora,
    (now() at time zone 'UTC')::date        as hoy,
    coalesce((select c.valor::int from public.config c where c.clave = 'dias_cierra_pronto'), 30)        as dias_cierra_pronto,
    coalesce((select c.valor::int from public.config c where c.clave = 'dias_verificacion_antigua'), 120) as dias_verif_antigua
),
base as (
  select
    b.id, b.slug, b.titulo,
    b.institucion_id,
    i.nombre    as institucion_nombre,
    i.pais_iso2 as institucion_pais_iso2,
    b.url_oficial, b.tipo_cobertura, b.monto, b.moneda,
    b.idioma_requisito, b.nacionalidad_abierta_a_todas,
    b.publicada_el, b.idiomas_requeridos, b.certificacion_idioma, b.monto_periodo,
    b.verificado_el,
    cv.deadline_at, cv.deadline_tz, cv.deadline_solo_fecha, cv.tipo_deadline,
    cv.id as convocatoria_id,
    cv.url_fuente,
    least(b.verificado_el, cv.verificado_el) as verificado_min,
    (select coalesce(array_agg(d.pais_iso2 order by d.pais_iso2), '{}'::char(2)[])
       from public.beca_pais_destino d where d.beca_id = b.id)          as paises_destino,
    (select coalesce(array_agg(n.pais_iso2 order by n.pais_iso2), '{}'::char(2)[])
       from public.beca_nacionalidad_elegible n where n.beca_id = b.id) as nacionalidades_elegibles,
    (select coalesce(array_agg(l.nivel order by l.nivel), '{}'::public.nivel_beca[])
       from public.beca_nivel l where l.beca_id = b.id)                 as niveles,
    (select coalesce(array_agg(a.area_slug order by a.area_slug), '{}'::text[])
       from public.beca_area a where a.beca_id = b.id)                  as areas,
    (select min(f.apertura_at) from public.convocatoria f
      where f.beca_id = b.id and f.apertura_at > cfg.ahora)             as proxima_convocatoria_apertura
  from public.beca b
  cross join cfg
  join public.institucion i on i.id = b.institucion_id
  left join lateral (
    select c.id, c.deadline_at, c.deadline_tz, c.deadline_solo_fecha,
           c.tipo_deadline, c.url_fuente, c.verificado_el
    from public.convocatoria c
    where c.beca_id = b.id
      and (c.apertura_at is null or c.apertura_at <= cfg.ahora)
    order by
      case
        when c.tipo_deadline = 'fija' and c.deadline_at >= cfg.ahora then 1
        when c.tipo_deadline = 'rolling'       then 2
        when c.tipo_deadline = 'por_confirmar' then 3
        else 4
      end,
      case when c.tipo_deadline = 'fija' and c.deadline_at >= cfg.ahora then c.deadline_at end asc,
      c.deadline_at desc nulls last,
      c.verificado_el desc,
      c.id
    limit 1
  ) cv on true
  where b.estado_revision = 'publicada'
),
calc as (
  select
    base.*,
    (base.verificado_min < cfg.hoy - cfg.dias_verif_antigua) as verificacion_antigua,
    case
      when base.convocatoria_id is null then 'por_confirmar'
      when base.tipo_deadline = 'fija' then
        case
          when base.deadline_at <  cfg.ahora then 'cerrada'
          when base.deadline_at <  cfg.ahora + cfg.dias_cierra_pronto * interval '1 day' then 'cierra_pronto'
          else 'abierta'
        end
      when base.tipo_deadline = 'rolling' then
        case when base.verificado_min < cfg.hoy - cfg.dias_verif_antigua
             then 'por_confirmar' else 'abierta' end
      else 'por_confirmar'
    end as estado
  from base cross join cfg
)
select
  calc.id, calc.slug, calc.titulo,
  calc.institucion_id, calc.institucion_nombre, calc.institucion_pais_iso2,
  calc.paises_destino, calc.niveles, calc.areas,
  calc.tipo_cobertura, calc.monto, calc.moneda,
  calc.idioma_requisito, calc.nacionalidad_abierta_a_todas, calc.nacionalidades_elegibles,
  calc.deadline_at, calc.deadline_tz, calc.deadline_solo_fecha, calc.tipo_deadline,
  calc.estado,
  case when calc.tipo_deadline = 'fija' and calc.estado in ('abierta', 'cierra_pronto')
       then ceil(extract(epoch from (calc.deadline_at - now())) / 86400)::int
  end as dias_restantes,
  calc.verificado_el, calc.verificacion_antigua,
  calc.url_oficial, calc.url_fuente,
  calc.proxima_convocatoria_apertura,
  -- columnas nuevas (Fase 3): siempre al final
  calc.publicada_el, calc.idiomas_requeridos, calc.certificacion_idioma, calc.monto_periodo
from calc;

drop view public.beca_detalle;

create view public.beca_detalle
with (security_invoker = true) as
select
  bp.*,
  b.descripcion_corta,
  b.cobertura_detalle,
  b.requisitos_clave
from public.becas_publicas bp
join public.beca b on b.id = bp.id;

revoke all on public.becas_publicas, public.beca_detalle from anon, authenticated;
grant select on public.becas_publicas, public.beca_detalle to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Umbrales definitivos (aprobados en Fase 3)
-- ---------------------------------------------------------------------------
update public.config
   set valor = '30',
       descripcion = 'Dias antes del deadline para estado cierra_pronto. Aprobado en Fase 3 (30).'
 where clave = 'dias_cierra_pronto';
update public.config
   set valor = '120',
       descripcion = 'Dias tras los cuales una verificacion se considera antigua (y una beca rolling pasa a por_confirmar). Aprobado en Fase 3 (120).'
 where clave = 'dias_verificacion_antigua';

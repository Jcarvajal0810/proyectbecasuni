-- 20260930012907_vistas_publicas.sql
-- Vistas publicas. security_invoker = true: se evalua RLS del usuario que consulta.
-- El estado se deriva aqui, al leer, con now() y umbrales de public.config. Sin cron.
--
-- Convocatoria vigente por beca (entre las ya abiertas: apertura_at null o <= now()):
--   1) fija con deadline_at >= now() (la mas proxima)
--   2) rolling
--   3) por_confirmar
--   4) fija pasada mas reciente  -> estado 'cerrada'
-- Convocatorias con apertura_at > now() no son vigentes; solo alimentan
-- proxima_convocatoria_apertura (la mas cercana, registrada con fuente).
--
-- estado:
--   sin convocatoria vigente ............ por_confirmar
--   fija: deadline < now ................ cerrada
--   fija: deadline < now + N dias ....... cierra_pronto   (N = config.dias_cierra_pronto)
--   fija: resto ......................... abierta
--   rolling con verificacion reciente ... abierta (continua)
--   rolling con verificacion antigua .... por_confirmar
--   tipo por_confirmar .................. por_confirmar
-- verificacion_antigua: la fecha mas vieja entre beca.verificado_el y
-- convocatoria.verificado_el supera config.dias_verificacion_antigua.

create view public.becas_publicas
with (security_invoker = true) as
with cfg as (
  select
    now()                                   as ahora,
    (now() at time zone 'UTC')::date        as hoy,
    coalesce((select c.valor::int from public.config c where c.clave = 'dias_cierra_pronto'), 14)        as dias_cierra_pronto,
    coalesce((select c.valor::int from public.config c where c.clave = 'dias_verificacion_antigua'), 180) as dias_verif_antigua
),
base as (
  select
    b.id, b.slug, b.titulo,
    b.institucion_id,
    i.nombre    as institucion_nombre,
    i.pais_iso2 as institucion_pais_iso2,
    b.url_oficial, b.tipo_cobertura, b.monto, b.moneda,
    b.idioma_requisito, b.nacionalidad_abierta_a_todas,
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
  calc.proxima_convocatoria_apertura
from calc;

-- Detalle: lista + textos largos.
create view public.beca_detalle
with (security_invoker = true) as
select
  bp.*,
  b.descripcion_corta,
  b.cobertura_detalle,
  b.requisitos_clave
from public.becas_publicas bp
join public.beca b on b.id = bp.id;

-- Lo que ilumina el globo. n_abiertas incluye las cierra_pronto (n_cierra_pronto es subconjunto).
create view public.paises_con_becas
with (security_invoker = true) as
select
  d.iso2,
  count(*)::int                                          as n_abiertas,
  (count(*) filter (where bp.estado = 'cierra_pronto'))::int as n_cierra_pronto
from public.becas_publicas bp
cross join lateral unnest(bp.paises_destino) as d(iso2)
where bp.estado in ('abierta', 'cierra_pronto')
group by d.iso2;

revoke all on public.becas_publicas, public.beca_detalle, public.paises_con_becas from anon, authenticated;
grant select on public.becas_publicas, public.beca_detalle, public.paises_con_becas to anon, authenticated;

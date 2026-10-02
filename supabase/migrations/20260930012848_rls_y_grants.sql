-- 20260930012848_rls_y_grants.sql
-- RLS en todas las tablas; anon/authenticated solo SELECT (y solo becas publicadas).
-- La escritura la hacen los curadores con rol postgres/service (bypass de RLS).

-- Privilegios: quitar todo lo que Supabase concede por defecto y dar solo SELECT.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
-- Sin 'in schema': el EXECUTE de PUBLIC es un default global.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

grant select on
  public.config, public.pais, public.area, public.institucion,
  public.beca_pais_destino, public.beca_nacionalidad_elegible, public.beca_nivel,
  public.beca_area
to anon, authenticated;

-- Grants por columna: excluyen beca.verificado_por (dato personal) y
-- convocatoria.notas / requiere_revision (internos). select=* de tabla falla para anon;
-- la app debe usar las vistas.
grant select (id, slug, titulo, institucion_id, descripcion_corta, url_oficial, tipo_cobertura,
  cobertura_detalle, monto, moneda, idioma_requisito, requisitos_clave,
  nacionalidad_abierta_a_todas, verificado_el, estado_revision, created_at, updated_at)
  on public.beca to anon, authenticated;
grant select (id, beca_id, apertura_at, deadline_at, deadline_tz, deadline_solo_fecha,
  tipo_deadline, url_fuente, verificado_el, created_at, updated_at)
  on public.convocatoria to anon, authenticated;


-- RLS
alter table public.config                     enable row level security;
alter table public.pais                       enable row level security;
alter table public.area                       enable row level security;
alter table public.institucion                enable row level security;
alter table public.beca                       enable row level security;
alter table public.beca_pais_destino          enable row level security;
alter table public.beca_nacionalidad_elegible enable row level security;
alter table public.beca_nivel                 enable row level security;
alter table public.beca_area                  enable row level security;
alter table public.convocatoria               enable row level security;

-- Catalogos: lectura publica (config: solo claves publicas)
create policy config_select      on public.config      for select to anon, authenticated
  using (clave in ('dias_cierra_pronto', 'dias_verificacion_antigua'));
create policy pais_select        on public.pais        for select to anon, authenticated using (true);
create policy area_select        on public.area        for select to anon, authenticated using (true);
-- Institucion: solo las que tienen al menos una beca publicada
create policy institucion_select on public.institucion for select to anon, authenticated
  using (exists (select 1 from public.beca b
                 where b.institucion_id = institucion.id and b.estado_revision = 'publicada'));

-- Beca: solo publicadas
create policy beca_select_publicadas on public.beca
  for select to anon, authenticated
  using (estado_revision = 'publicada');

-- Tablas hijas: solo filas cuya beca esta publicada
create policy beca_pais_destino_select on public.beca_pais_destino
  for select to anon, authenticated
  using (exists (select 1 from public.beca b where b.id = beca_pais_destino.beca_id and b.estado_revision = 'publicada'));

create policy beca_nacionalidad_elegible_select on public.beca_nacionalidad_elegible
  for select to anon, authenticated
  using (exists (select 1 from public.beca b where b.id = beca_nacionalidad_elegible.beca_id and b.estado_revision = 'publicada'));

create policy beca_nivel_select on public.beca_nivel
  for select to anon, authenticated
  using (exists (select 1 from public.beca b where b.id = beca_nivel.beca_id and b.estado_revision = 'publicada'));

create policy beca_area_select on public.beca_area
  for select to anon, authenticated
  using (exists (select 1 from public.beca b where b.id = beca_area.beca_id and b.estado_revision = 'publicada'));

create policy convocatoria_select on public.convocatoria
  for select to anon, authenticated
  using (exists (select 1 from public.beca b where b.id = convocatoria.beca_id and b.estado_revision = 'publicada'));

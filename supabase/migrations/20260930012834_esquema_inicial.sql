-- 20260930012834_esquema_inicial.sql
-- Esquema base de becasuapp: enums, tablas, funciones, triggers e indices.
-- RLS, grants y vistas van en migraciones posteriores.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.tipo_institucion as enum ('gobierno', 'universidad', 'fundacion', 'organismo', 'otro');
create type public.tipo_cobertura   as enum ('total', 'parcial', 'no_especificada');
create type public.estado_revision  as enum ('borrador', 'en_revision', 'publicada', 'retirada');
create type public.tipo_deadline    as enum ('fija', 'rolling', 'por_confirmar');
create type public.nivel_beca       as enum ('pregrado', 'maestria', 'doctorado', 'posdoc', 'curso_corto', 'intercambio', 'investigacion');

-- ---------------------------------------------------------------------------
-- Funciones (search_path vacio + nombres calificados; sin SECURITY DEFINER)
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

-- Valida deadline_tz (IANA) y marca requiere_revision si hay fecha limite sin zona.
create function public.convocatoria_validar_tz()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deadline_tz is not null
     and not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = new.deadline_tz) then
    raise exception 'deadline_tz % no es una zona IANA valida (ver pg_timezone_names)', new.deadline_tz
      using errcode = '22023';
  end if;

  -- Zona desconocida: se fuerza revision humana (y el curador debe guardar
  -- deadline_at con la interpretacion conservadora, ver deadline_fin_del_dia).
  if new.deadline_at is not null and new.deadline_tz is null then
    new.requiere_revision := true;
  end if;

  return new;
end;
$$;

-- Helper para curadores: fin del dia (23:59:59) de una fecha en la zona oficial.
-- Si la zona es desconocida (null) usa Pacific/Kiritimati (UTC+14): el instante
-- mas temprano posible para "fin del dia", es decir, la interpretacion
-- conservadora (cerrar antes). Uso: select public.deadline_fin_del_dia('2026-12-15','Europe/London');
create function public.deadline_fin_del_dia(fecha date, tz text default null)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (fecha::timestamp + interval '1 day' - interval '1 second')
         at time zone coalesce(tz, 'Pacific/Kiritimati');
$$;

-- verificado_el no puede estar en el futuro (tolerancia de 1 dia por husos horarios).
create function public.validar_verificado_el()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.verificado_el > (pg_catalog.now() at time zone 'UTC')::date + 1 then
    raise exception 'verificado_el (%) no puede estar en el futuro', new.verificado_el
      using errcode = '22007';
  end if;
  return new;
end;
$$;

revoke execute on function public.validar_verificado_el()     from public, anon, authenticated;
revoke execute on function public.set_updated_at()            from public, anon, authenticated;
revoke execute on function public.convocatoria_validar_tz()   from public, anon, authenticated;
revoke execute on function public.deadline_fin_del_dia(date, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Catalogos
-- ---------------------------------------------------------------------------
create table public.config (
  clave       text primary key,
  valor       text not null,
  descripcion text,
  -- claves publicas (expuestas a anon) deben ser enteros de 1 a 4 digitos
  constraint config_claves_publicas_enteras
    check (clave not in ('dias_cierra_pronto', 'dias_verificacion_antigua') or valor ~ '^[0-9]{1,4}$')
);

create table public.pais (
  iso2      char(2) primary key check (iso2 ~ '^[A-Z]{2}$'),
  iso3      char(3) unique check (iso3 ~ '^[A-Z]{3}$'),
  nombre_es text not null,
  nombre_en text not null
);

create table public.area (
  slug      text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre_es text not null
);

create table public.institucion (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (length(btrim(nombre)) > 0),
  tipo       public.tipo_institucion not null default 'otro',
  pais_iso2  char(2) references public.pais (iso2) on update cascade on delete restrict,
  url        text check (url ~* '^https://[^\s/?#@]+\.[^\s]*$' and length(url) <= 2048),
  created_at timestamptz not null default now()
);
create index institucion_pais_iso2_idx on public.institucion (pais_iso2);

-- ---------------------------------------------------------------------------
-- Beca
-- ---------------------------------------------------------------------------
create table public.beca (
  id                             uuid primary key default gen_random_uuid(),
  slug                           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo                         text not null check (length(btrim(titulo)) > 0),
  institucion_id                 uuid not null references public.institucion (id) on delete restrict,
  descripcion_corta              text,
  url_oficial                    text not null check (url_oficial ~* '^https://[^\s/?#@]+\.[^\s]*$' and length(url_oficial) <= 2048),
  tipo_cobertura                 public.tipo_cobertura not null default 'no_especificada',
  cobertura_detalle              text,            -- texto literal de la fuente oficial
  monto                          numeric check (monto is null or monto >= 0),
  moneda                         char(3) check (moneda ~ '^[A-Z]{3}$'),  -- ISO 4217
  idioma_requisito               text,
  requisitos_clave               text check (requisitos_clave is null or length(requisitos_clave) <= 600),
  nacionalidad_abierta_a_todas   boolean not null default false,
  verificado_el                  date not null,
  verificado_por                 text,
  estado_revision                public.estado_revision not null default 'borrador',
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  constraint beca_monto_moneda_juntos check ((monto is null) = (moneda is null))
);
create index beca_institucion_id_idx   on public.beca (institucion_id);
create index beca_estado_revision_idx  on public.beca (estado_revision);
create trigger beca_validar_verificado_el before insert or update on public.beca
  for each row execute function public.validar_verificado_el();
create trigger beca_set_updated_at before update on public.beca
  for each row execute function public.set_updated_at();

-- N:M
create table public.beca_pais_destino (
  beca_id   uuid not null references public.beca (id) on delete cascade,
  pais_iso2 char(2) not null references public.pais (iso2) on update cascade on delete restrict,
  primary key (beca_id, pais_iso2)
);
create index beca_pais_destino_iso2_idx on public.beca_pais_destino (pais_iso2, beca_id);

create table public.beca_nacionalidad_elegible (
  beca_id   uuid not null references public.beca (id) on delete cascade,
  pais_iso2 char(2) not null references public.pais (iso2) on update cascade on delete restrict,
  primary key (beca_id, pais_iso2)
);
create index beca_nacionalidad_elegible_iso2_idx on public.beca_nacionalidad_elegible (pais_iso2, beca_id);

create table public.beca_nivel (
  beca_id uuid not null references public.beca (id) on delete cascade,
  nivel   public.nivel_beca not null,
  primary key (beca_id, nivel)
);

create table public.beca_area (
  beca_id   uuid not null references public.beca (id) on delete cascade,
  area_slug text not null references public.area (slug) on update cascade on delete restrict,
  primary key (beca_id, area_slug)
);
create index beca_area_slug_idx on public.beca_area (area_slug, beca_id);

-- ---------------------------------------------------------------------------
-- Convocatoria (nunca se generan fechas futuras automaticamente)
-- ---------------------------------------------------------------------------
create table public.convocatoria (
  id                   uuid primary key default gen_random_uuid(),
  beca_id              uuid not null references public.beca (id) on delete cascade,
  apertura_at          timestamptz,
  deadline_at          timestamptz,
  deadline_tz          text,                          -- IANA, validada por trigger
  deadline_solo_fecha  boolean not null default false,
  tipo_deadline        public.tipo_deadline not null default 'por_confirmar',
  url_fuente           text not null check (url_fuente ~* '^https://[^\s/?#@]+\.[^\s]*$' and length(url_fuente) <= 2048),
  verificado_el        date not null,
  notas                text,
  requiere_revision    boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint convocatoria_fija_requiere_deadline check (tipo_deadline <> 'fija' or deadline_at is not null),
  constraint convocatoria_solo_fecha_requiere_deadline check (not deadline_solo_fecha or deadline_at is not null),
  constraint convocatoria_apertura_antes_deadline check (apertura_at is null or deadline_at is null or apertura_at <= deadline_at)
);
create index convocatoria_beca_deadline_idx on public.convocatoria (beca_id, deadline_at desc);
create index convocatoria_deadline_at_idx   on public.convocatoria (deadline_at);
create trigger convocatoria_validar_tz before insert or update on public.convocatoria
  for each row execute function public.convocatoria_validar_tz();
create trigger convocatoria_validar_verificado_el before insert or update on public.convocatoria
  for each row execute function public.validar_verificado_el();
create trigger convocatoria_set_updated_at before update on public.convocatoria
  for each row execute function public.set_updated_at();

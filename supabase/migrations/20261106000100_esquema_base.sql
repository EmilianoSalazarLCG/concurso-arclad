-- =============================================================================
-- Concurso ARclad — Esquema base
-- Tablas: admins, propuestas, criterios, rondas, ronda_propuestas, calificaciones
-- =============================================================================

create extension if not exists pg_trgm  with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Función genérica para mantener updated_at -----------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- admins ----------------------------------------------------------------------
-- Solo quien esté aquí puede usar el panel de administración.
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null check (length(btrim(nombre)) > 0),
  correo     text not null unique check (position('@' in correo) > 1),
  created_at timestamptz not null default now()
);
comment on table public.admins is 'Usuarios de Supabase Auth autorizados para el panel de administración.';

-- propuestas ------------------------------------------------------------------
create table public.propuestas (
  id                  uuid primary key default gen_random_uuid(),
  folio               integer generated always as identity unique,
  participante_nombre text not null check (length(btrim(participante_nombre)) > 0),
  area                text not null check (length(btrim(area)) > 0),
  ciudad              text not null check (length(btrim(ciudad)) > 0),
  nombre_propuesto    text not null check (length(btrim(nombre_propuesto)) > 0),
  significado         text not null check (length(btrim(significado)) > 0),
  logo_path           text not null check (length(btrim(logo_path)) > 0),
  notas_internas      text,
  estado              text not null default 'activa' check (estado in ('activa', 'descartada')),
  created_by          uuid not null default auth.uid() references auth.users (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
comment on column public.propuestas.folio is 'Consecutivo visible; se muestra con 3 dígitos (001, 002…).';
comment on column public.propuestas.logo_path is 'Ruta del archivo dentro del bucket privado "logos" (nombre uuid).';
comment on column public.propuestas.notas_internas is 'Solo visible para admins; nunca se muestra a gerentes ni en modo reunión.';

create index propuestas_estado_idx on public.propuestas (estado);

create trigger propuestas_set_updated_at
  before update on public.propuestas
  for each row execute function public.set_updated_at();

-- criterios -------------------------------------------------------------------
create table public.criterios (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique check (length(btrim(nombre)) > 0),
  descripcion text,
  orden       integer not null,
  activo      boolean not null default true
);

insert into public.criterios (nombre, descripcion, orden) values
  ('Alineación con la visión', '¿Qué tan bien refleja el nombre y el logo la visión del proyecto?', 1),
  ('Creatividad',              '¿Es una propuesta original y memorable?',                          2),
  ('Impacto visual',           '¿El logo es atractivo, claro y funciona visualmente?',             3),
  ('Claridad del mensaje',     '¿Se entiende fácilmente lo que el nombre y el logo comunican?',    4);

-- rondas ----------------------------------------------------------------------
create table public.rondas (
  id         uuid primary key default gen_random_uuid(),
  numero     integer not null unique check (numero > 0),
  nombre     text not null check (length(btrim(nombre)) > 0),
  estado     text not null default 'pendiente' check (estado in ('pendiente', 'abierta', 'cerrada')),
  top_n      integer not null check (top_n > 0),
  created_at timestamptz not null default now()
);

-- Solo puede haber una ronda abierta a la vez (el embudo es secuencial).
create unique index rondas_una_abierta_idx on public.rondas ((true)) where estado = 'abierta';

insert into public.rondas (numero, nombre, top_n) values
  (1, 'Selección Top 15', 15),
  (2, 'Selección Top 5',   5),
  (3, 'Final Top 3',       3);

-- ronda_propuestas ------------------------------------------------------------
create table public.ronda_propuestas (
  ronda_id       uuid not null references public.rondas (id) on delete cascade,
  propuesta_id   uuid not null references public.propuestas (id) on delete cascade,
  posicion_final integer check (posicion_final > 0),
  created_at     timestamptz not null default now(),
  constraint ronda_propuestas_pkey primary key (ronda_id, propuesta_id)
);
create index ronda_propuestas_propuesta_idx on public.ronda_propuestas (propuesta_id);

-- calificaciones --------------------------------------------------------------
create table public.calificaciones (
  id           uuid primary key default gen_random_uuid(),
  ronda_id     uuid not null,
  propuesta_id uuid not null,
  votante_id   text not null check (votante_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  criterio_id  uuid not null references public.criterios (id),
  puntaje      smallint not null check (puntaje between 1 and 5),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Re-votar reemplaza la calificación anterior (upsert sobre esta llave).
  constraint calificaciones_unica unique (ronda_id, propuesta_id, votante_id, criterio_id),
  -- La propuesta debe pertenecer a la ronda.
  constraint calificaciones_ronda_propuesta_fkey
    foreign key (ronda_id, propuesta_id)
    references public.ronda_propuestas (ronda_id, propuesta_id) on delete cascade
);
comment on column public.calificaciones.votante_id is 'Id del gerente definido en src/config/votantes.ts.';
create index calificaciones_ronda_idx on public.calificaciones (ronda_id, propuesta_id);

create trigger calificaciones_set_updated_at
  before update on public.calificaciones
  for each row execute function public.set_updated_at();

-- Defensa en profundidad: solo se califica en rondas abiertas y con criterios activos.
create or replace function public.validar_calificacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.rondas r where r.id = new.ronda_id and r.estado = 'abierta') then
    raise exception 'La ronda no está abierta' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.criterios c where c.id = new.criterio_id and c.activo) then
    raise exception 'El criterio no está activo' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger calificaciones_validar
  before insert or update on public.calificaciones
  for each row execute function public.validar_calificacion();

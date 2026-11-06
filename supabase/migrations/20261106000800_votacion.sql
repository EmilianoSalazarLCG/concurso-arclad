-- =============================================================================
-- Fase 6: envío explícito del voto y reglas de rondas
-- - calificaciones           = avance (se guarda solo mientras el gerente califica)
-- - calificaciones_enviadas  = "foto" de lo enviado; es lo único que cuenta en resultados
-- - votos_enviados           = quién envió y cuándo (por ronda)
-- =============================================================================

create table public.calificaciones_enviadas (
  ronda_id     uuid not null,
  propuesta_id uuid not null,
  votante_id   text not null,
  criterio_id  uuid not null references public.criterios (id),
  puntaje      smallint not null check (puntaje between 1 and 5),
  constraint calificaciones_enviadas_pkey primary key (ronda_id, propuesta_id, votante_id, criterio_id),
  constraint calificaciones_enviadas_ronda_propuesta_fkey
    foreign key (ronda_id, propuesta_id)
    references public.ronda_propuestas (ronda_id, propuesta_id) on delete cascade
);
create index calificaciones_enviadas_votante_idx on public.calificaciones_enviadas (ronda_id, votante_id);

create table public.votos_enviados (
  ronda_id       uuid not null references public.rondas (id) on delete cascade,
  votante_id     text not null check (votante_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  enviado_at     timestamptz not null default now(),
  calificaciones integer not null,
  constraint votos_enviados_pkey primary key (ronda_id, votante_id)
);
comment on table public.votos_enviados is 'Un gerente "votó" cuando existe su fila aquí (envió con todo calificado).';

alter table public.calificaciones_enviadas enable row level security;
alter table public.votos_enviados          enable row level security;
revoke all on public.calificaciones_enviadas, public.votos_enviados from anon;

create policy "calificaciones_enviadas: lectura para admins"
  on public.calificaciones_enviadas for select to authenticated using ((select public.es_admin()));
create policy "votos_enviados: lectura para admins"
  on public.votos_enviados for select to authenticated using ((select public.es_admin()));

-- Calificaciones esperadas en una ronda = propuestas ACTIVAS asignadas × criterios ACTIVOS.
create or replace function public.calificaciones_esperadas(p_ronda uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select (
    (select count(*) from public.ronda_propuestas rp
       join public.propuestas p on p.id = rp.propuesta_id and p.estado = 'activa'
      where rp.ronda_id = p_ronda)
    *
    (select count(*) from public.criterios c where c.activo)
  )::integer;
$$;

-- Defensa en la base: solo se registra un envío completo y con la ronda abierta.
create or replace function public.validar_voto_enviado()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_esperadas integer := public.calificaciones_esperadas(new.ronda_id);
  v_enviadas  integer;
begin
  if not exists (select 1 from public.rondas r where r.id = new.ronda_id and r.estado = 'abierta') then
    raise exception 'La votación no está abierta.' using errcode = 'check_violation';
  end if;
  select count(*) into v_enviadas
    from public.calificaciones_enviadas ce
    join public.propuestas p on p.id = ce.propuesta_id and p.estado = 'activa'
    join public.criterios c on c.id = ce.criterio_id and c.activo
   where ce.ronda_id = new.ronda_id and ce.votante_id = new.votante_id;
  if v_esperadas = 0 or v_enviadas < v_esperadas then
    raise exception 'Faltan calificaciones: % de %.', v_enviadas, v_esperadas using errcode = 'check_violation';
  end if;
  new.calificaciones := v_enviadas;
  return new;
end;
$$;

create trigger votos_enviados_validar
  before insert or update on public.votos_enviados
  for each row execute function public.validar_voto_enviado();

-- Enviar (o re-enviar) el voto: copia el avance actual como "foto" y registra el envío.
-- Atómico: si falta algo o la ronda no está abierta, no cambia nada. Solo service role.
create or replace function public.enviar_voto(p_ronda uuid, p_votante text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_esperadas integer;
  v_tiene     integer;
  v_ahora     timestamptz := now();
begin
  perform 1 from public.rondas r where r.id = p_ronda and r.estado = 'abierta' for share;
  if not found then
    raise exception 'La votación no está abierta.' using errcode = 'check_violation';
  end if;

  v_esperadas := public.calificaciones_esperadas(p_ronda);
  select count(*) into v_tiene
    from public.calificaciones c
    join public.ronda_propuestas rp on rp.ronda_id = c.ronda_id and rp.propuesta_id = c.propuesta_id
    join public.propuestas p on p.id = c.propuesta_id and p.estado = 'activa'
    join public.criterios cr on cr.id = c.criterio_id and cr.activo
   where c.ronda_id = p_ronda and c.votante_id = p_votante;
  if v_esperadas = 0 or v_tiene < v_esperadas then
    raise exception 'Faltan calificaciones: % de %.', v_tiene, v_esperadas using errcode = 'check_violation';
  end if;

  delete from public.calificaciones_enviadas where ronda_id = p_ronda and votante_id = p_votante;
  insert into public.calificaciones_enviadas (ronda_id, propuesta_id, votante_id, criterio_id, puntaje)
  select c.ronda_id, c.propuesta_id, c.votante_id, c.criterio_id, c.puntaje
    from public.calificaciones c
    join public.propuestas p on p.id = c.propuesta_id and p.estado = 'activa'
    join public.criterios cr on cr.id = c.criterio_id and cr.activo
   where c.ronda_id = p_ronda and c.votante_id = p_votante;

  insert into public.votos_enviados (ronda_id, votante_id, enviado_at, calificaciones)
  values (p_ronda, p_votante, v_ahora, 0)
  on conflict (ronda_id, votante_id) do update set enviado_at = excluded.enviado_at, calificaciones = 0;

  return v_ahora;
end;
$$;

revoke execute on function public.enviar_voto(uuid, text) from public, anon, authenticated;
grant  execute on function public.enviar_voto(uuid, text) to service_role;
revoke execute on function public.calificaciones_esperadas(uuid) from public, anon;

-- Reglas de rondas -----------------------------------------------------------
-- Las propuestas de una ronda solo se agregan/quitan mientras está 'pendiente'.
create or replace function public.validar_cambio_ronda_propuestas()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_estado text;
begin
  select estado into v_estado from public.rondas where id = coalesce(new.ronda_id, old.ronda_id);
  if v_estado is not null and v_estado <> 'pendiente' then
    raise exception 'Solo se pueden agregar o quitar propuestas mientras la ronda está pendiente (está %).', v_estado
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger ronda_propuestas_solo_pendiente
  before insert or delete on public.ronda_propuestas
  for each row execute function public.validar_cambio_ronda_propuestas();

-- No se puede abrir una ronda sin propuestas activas.
create or replace function public.validar_apertura_ronda()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'abierta' and old.estado <> 'abierta' and not exists (
    select 1 from public.ronda_propuestas rp
      join public.propuestas p on p.id = rp.propuesta_id and p.estado = 'activa'
     where rp.ronda_id = new.id
  ) then
    raise exception 'No se puede abrir una ronda sin propuestas.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger rondas_validar_apertura
  before update on public.rondas
  for each row execute function public.validar_apertura_ronda();

-- Resultados: solo cuentan los votos ENVIADOS ---------------------------------
create or replace view public.resultados_ronda
with (security_invoker = true)
as
with por_criterio as (
  select
    c.ronda_id,
    c.propuesta_id,
    c.criterio_id,
    avg(c.puntaje)::numeric as promedio,
    count(*)::integer       as calificaciones
  from public.calificaciones_enviadas c
  join public.criterios cr on cr.id = c.criterio_id and cr.activo
  group by c.ronda_id, c.propuesta_id, c.criterio_id
),
por_propuesta as (
  select
    rp.ronda_id,
    rp.propuesta_id,
    rp.posicion_final,
    (select round(avg(c.puntaje)::numeric, 2)
       from public.calificaciones_enviadas c
       join public.criterios cr on cr.id = c.criterio_id and cr.activo
      where c.ronda_id = rp.ronda_id and c.propuesta_id = rp.propuesta_id) as promedio_general,
    (select count(distinct c.votante_id)::integer
       from public.calificaciones_enviadas c
      where c.ronda_id = rp.ronda_id and c.propuesta_id = rp.propuesta_id) as gerentes_calificaron,
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'criterio_id', cr.id,
               'criterio',    cr.nombre,
               'orden',       cr.orden,
               'promedio',    round(pc.promedio, 2),
               'calificaciones', pc.calificaciones
             ) order by cr.orden)
        from public.criterios cr
        join por_criterio pc
          on pc.criterio_id = cr.id
         and pc.ronda_id = rp.ronda_id
         and pc.propuesta_id = rp.propuesta_id
       where cr.activo
    ), '[]'::jsonb) as promedio_por_criterio
  from public.ronda_propuestas rp
)
select
  pp.ronda_id,
  r.numero          as ronda_numero,
  pp.propuesta_id,
  p.folio,
  p.nombre_propuesto,
  p.participante_nombre,
  p.estado          as propuesta_estado,
  pp.promedio_general,
  pp.promedio_por_criterio,
  pp.gerentes_calificaron,
  rank() over (
    partition by pp.ronda_id
    order by pp.promedio_general desc nulls last
  )::integer        as posicion,
  pp.posicion_final
from por_propuesta pp
join public.rondas r     on r.id = pp.ronda_id
join public.propuestas p on p.id = pp.propuesta_id;

comment on view public.resultados_ronda is
  'Ranking por ronda con votos ENVIADOS (calificaciones_enviadas). posicion usa rank(); posicion_final la registran admins.';

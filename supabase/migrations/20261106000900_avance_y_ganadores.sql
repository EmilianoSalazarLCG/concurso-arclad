-- =============================================================================
-- Fase 7: avance entre rondas y confirmación de ganadores
-- =============================================================================

create table public.avances_ronda (
  ronda_origen_id  uuid primary key references public.rondas (id) on delete cascade,
  ronda_destino_id uuid not null references public.rondas (id) on delete cascade,
  propuestas       integer not null,
  realizado_por    uuid references auth.users (id) on delete set null,
  realizado_at     timestamptz not null default now()
);
comment on table public.avances_ronda is 'Quién y cuándo pasó las propuestas de una ronda a la siguiente.';

create table public.ganadores_confirmados (
  ronda_id       uuid primary key references public.rondas (id) on delete cascade,
  confirmado_por uuid references auth.users (id) on delete set null,
  confirmado_at  timestamptz not null default now()
);
comment on table public.ganadores_confirmados is 'Top 3 confirmado por un admin (posicion_final 1–3 en ronda_propuestas de la ronda final).';

alter table public.avances_ronda         enable row level security;
alter table public.ganadores_confirmados enable row level security;
revoke all on public.avances_ronda, public.ganadores_confirmados from anon;
create policy "avances_ronda: lectura para admins"
  on public.avances_ronda for select to authenticated using ((select public.es_admin()));
create policy "ganadores_confirmados: lectura para admins"
  on public.ganadores_confirmados for select to authenticated using ((select public.es_admin()));

-- Pasa las propuestas elegidas a la siguiente ronda (atómico).
create or replace function public.pasar_a_siguiente_ronda(p_origen uuid, p_propuestas uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_origen  public.rondas;
  v_destino public.rondas;
  v_ids     uuid[];
begin
  if not public.es_admin() then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  select * into v_origen from public.rondas where id = p_origen for update;
  if not found or v_origen.estado <> 'cerrada' then
    raise exception 'La ronda debe estar cerrada para pasar a la siguiente.' using errcode = 'check_violation';
  end if;
  select * into v_destino from public.rondas where numero = v_origen.numero + 1 for update;
  if not found then
    raise exception 'No hay una ronda siguiente.' using errcode = 'check_violation';
  end if;
  if v_destino.estado <> 'pendiente' then
    raise exception 'La Ronda % ya no está pendiente.', v_destino.numero using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.ronda_propuestas where ronda_id = v_destino.id) then
    raise exception 'La Ronda % ya tiene propuestas.', v_destino.numero using errcode = 'check_violation';
  end if;

  select array_agg(distinct x) into v_ids from unnest(p_propuestas) x;
  if coalesce(array_length(v_ids, 1), 0) = 0 then
    raise exception 'Selecciona al menos una propuesta.' using errcode = 'check_violation';
  end if;
  if exists (
    select x from unnest(v_ids) x
    except
    select rp.propuesta_id from public.ronda_propuestas rp
      join public.propuestas p on p.id = rp.propuesta_id and p.estado = 'activa'
     where rp.ronda_id = p_origen
  ) then
    raise exception 'Alguna propuesta seleccionada no pertenece a la ronda.' using errcode = 'check_violation';
  end if;

  -- Posición final en la ronda actual = posición del ranking (votos enviados).
  update public.ronda_propuestas rp
     set posicion_final = r.posicion
    from public.resultados_ronda r
   where rp.ronda_id = p_origen and r.ronda_id = p_origen and r.propuesta_id = rp.propuesta_id;

  insert into public.ronda_propuestas (ronda_id, propuesta_id)
  select v_destino.id, x from unnest(v_ids) x;

  insert into public.avances_ronda (ronda_origen_id, ronda_destino_id, propuestas, realizado_por)
  values (p_origen, v_destino.id, array_length(v_ids, 1), auth.uid());

  return array_length(v_ids, 1);
end;
$$;

-- Deshace el avance mientras la siguiente ronda siga pendiente y sin votos.
create or replace function public.deshacer_avance(p_origen uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_avance  public.avances_ronda;
  v_destino public.rondas;
begin
  if not public.es_admin() then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  select * into v_avance from public.avances_ronda where ronda_origen_id = p_origen for update;
  if not found then
    raise exception 'Esta ronda no tiene un avance que deshacer.' using errcode = 'check_violation';
  end if;
  select * into v_destino from public.rondas where id = v_avance.ronda_destino_id for update;
  if v_destino.estado <> 'pendiente'
     or exists (select 1 from public.calificaciones where ronda_id = v_destino.id)
     or exists (select 1 from public.votos_enviados where ronda_id = v_destino.id) then
    raise exception 'Ya no se puede deshacer: la Ronda % ya se abrió o tiene votos.', v_destino.numero
      using errcode = 'check_violation';
  end if;
  delete from public.ronda_propuestas where ronda_id = v_destino.id;
  update public.ronda_propuestas set posicion_final = null where ronda_id = p_origen;
  delete from public.avances_ronda where ronda_origen_id = p_origen;
end;
$$;

-- Confirma el Top 3 de la ronda final (resuelve empates). p_ids en orden: 1º, 2º, 3º.
create or replace function public.confirmar_ganadores(p_ronda uuid, p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ronda public.rondas;
begin
  if not public.es_admin() then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  select * into v_ronda from public.rondas where id = p_ronda for update;
  if not found or v_ronda.numero <> (select max(numero) from public.rondas) then
    raise exception 'Solo se confirman ganadores en la ronda final.' using errcode = 'check_violation';
  end if;
  if v_ronda.estado <> 'cerrada' then
    raise exception 'La ronda final debe estar cerrada.' using errcode = 'check_violation';
  end if;
  if coalesce(array_length(p_ids, 1), 0) <> v_ronda.top_n
     or (select count(distinct x) from unnest(p_ids) x) <> v_ronda.top_n then
    raise exception 'Elige % propuestas distintas.', v_ronda.top_n using errcode = 'check_violation';
  end if;
  if exists (
    select x from unnest(p_ids) x
    except
    select rp.propuesta_id from public.ronda_propuestas rp
      join public.propuestas p on p.id = rp.propuesta_id and p.estado = 'activa'
     where rp.ronda_id = p_ronda
  ) then
    raise exception 'Alguna propuesta no pertenece a la ronda final.' using errcode = 'check_violation';
  end if;

  update public.ronda_propuestas set posicion_final = null where ronda_id = p_ronda;
  update public.ronda_propuestas rp
     set posicion_final = t.lugar
    from unnest(p_ids) with ordinality as t(id, lugar)
   where rp.ronda_id = p_ronda and rp.propuesta_id = t.id;

  insert into public.ganadores_confirmados (ronda_id, confirmado_por)
  values (p_ronda, auth.uid())
  on conflict (ronda_id) do update set confirmado_por = excluded.confirmado_por, confirmado_at = now();
end;
$$;

revoke execute on function public.pasar_a_siguiente_ronda(uuid, uuid[]) from public, anon;
revoke execute on function public.deshacer_avance(uuid) from public, anon;
revoke execute on function public.confirmar_ganadores(uuid, uuid[]) from public, anon;
grant execute on function public.pasar_a_siguiente_ronda(uuid, uuid[]) to authenticated, service_role;
grant execute on function public.deshacer_avance(uuid) to authenticated, service_role;
grant execute on function public.confirmar_ganadores(uuid, uuid[]) to authenticated, service_role;

-- Reglas al cambiar el estado de una ronda:
-- - no se abre sin propuestas (ya existía);
-- - no se reabre si ya pasó a la siguiente ronda (hay que deshacer el avance);
-- - al reabrir la ronda final se anula la confirmación de ganadores.
create or replace function public.validar_apertura_ronda()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'abierta' and old.estado <> 'abierta' then
    if not exists (
      select 1 from public.ronda_propuestas rp
        join public.propuestas p on p.id = rp.propuesta_id and p.estado = 'activa'
       where rp.ronda_id = new.id
    ) then
      raise exception 'No se puede abrir una ronda sin propuestas.' using errcode = 'check_violation';
    end if;
    if exists (select 1 from public.avances_ronda where ronda_origen_id = new.id) then
      raise exception 'Esta ronda ya pasó a la siguiente. Deshaz el avance antes de reabrirla.' using errcode = 'check_violation';
    end if;
    delete from public.ganadores_confirmados where ronda_id = new.id;
    update public.ronda_propuestas set posicion_final = null where ronda_id = new.id;
  end if;
  return new;
end;
$$;

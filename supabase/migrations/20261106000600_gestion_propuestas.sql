-- =============================================================================
-- Fase 4: auditoría de ediciones, descarte con motivo y vista de gestión
-- =============================================================================

alter table public.propuestas
  add column updated_by      uuid references auth.users (id) on delete set null,
  add column motivo_descarte text,
  add column descartada_at   timestamptz,
  add column descartada_por  uuid references auth.users (id) on delete set null;

comment on column public.propuestas.updated_by is 'Último admin que editó el contenido (null = nunca editada).';
comment on column public.propuestas.motivo_descarte is 'Motivo opcional al descartar; se borra al restaurar.';

-- Reemplaza el trigger genérico de updated_at por uno de auditoría:
-- - updated_at/updated_by solo cambian si cambia el contenido (no al descartar/restaurar).
-- - Registra quién y cuándo descartó; limpia esos datos al restaurar.
-- - Bloquea descartar si la propuesta está en una ronda abierta o cerrada.
-- - Folio, created_by y created_at nunca cambian.
drop trigger if exists propuestas_set_updated_at on public.propuestas;

create or replace function public.propuestas_auditoria()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_ronda text;
begin
  new.created_by := old.created_by;
  new.created_at := old.created_at;

  if new.estado = 'descartada' and old.estado = 'activa' then
    select format('ronda %s «%s» (%s)', r.numero, r.nombre, r.estado)
      into v_ronda
      from public.ronda_propuestas rp
      join public.rondas r on r.id = rp.ronda_id
     where rp.propuesta_id = new.id
       and r.estado in ('abierta', 'cerrada')
     order by r.numero
     limit 1;
    if v_ronda is not null then
      raise exception 'No se puede descartar: la propuesta está asignada a la %.', v_ronda
        using errcode = 'check_violation';
    end if;
    new.descartada_at   := now();
    new.descartada_por  := v_uid;
    new.motivo_descarte := nullif(btrim(coalesce(new.motivo_descarte, '')), '');
  elsif new.estado = 'descartada' then
    new.descartada_at  := old.descartada_at;
    new.descartada_por := old.descartada_por;
  else
    new.motivo_descarte := null;
    new.descartada_at   := null;
    new.descartada_por  := null;
  end if;

  if (new.participante_nombre, new.area, new.ciudad, new.nombre_propuesto,
      new.significado, new.logo_path, new.notas_internas)
     is distinct from
     (old.participante_nombre, old.area, old.ciudad, old.nombre_propuesto,
      old.significado, old.logo_path, old.notas_internas) then
    new.updated_at := now();
    new.updated_by := coalesce(v_uid, old.updated_by);
  else
    new.updated_at := old.updated_at;
    new.updated_by := old.updated_by;
  end if;

  return new;
end;
$$;

create trigger propuestas_auditoria
  before update on public.propuestas
  for each row execute function public.propuestas_auditoria();

-- Vista de gestión para admins: nombres de quién capturó/editó/descartó y
-- columnas normalizadas (sin acentos ni mayúsculas) para buscar y ordenar.
create or replace view public.propuestas_admin
with (security_invoker = true)
as
select
  p.*,
  ca.nombre as capturada_por_nombre,
  ea.nombre as editada_por_nombre,
  da.nombre as descartada_por_nombre,
  lower(extensions.unaccent(
    lpad(p.folio::text, 3, '0') || ' ' || p.nombre_propuesto || ' ' || p.participante_nombre
  )) as busqueda,
  lower(extensions.unaccent(p.nombre_propuesto)) as nombre_orden
from public.propuestas p
left join public.admins ca on ca.user_id = p.created_by
left join public.admins ea on ea.user_id = p.updated_by
left join public.admins da on da.user_id = p.descartada_por;

revoke all on public.propuestas_admin from anon;

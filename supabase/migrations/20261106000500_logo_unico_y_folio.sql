-- =============================================================================
-- Fase 3: un logo pertenece a una sola propuesta + reinicio de folio
-- =============================================================================

-- Un archivo de logo no puede usarse en dos propuestas.
alter table public.propuestas
  add constraint propuestas_logo_path_key unique (logo_path);

-- Reinicia el consecutivo de folio a 1 SOLO si no hay propuestas.
-- Útil para dejar el folio en 001 después de pruebas, antes del lanzamiento.
-- Solo la service role puede ejecutarla.
create or replace function public.reiniciar_folio_si_vacio()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.propuestas) then
    return false;
  end if;
  perform setval(pg_get_serial_sequence('public.propuestas', 'folio'), 1, false);
  return true;
end;
$$;

revoke execute on function public.reiniciar_folio_si_vacio() from public, anon, authenticated;
grant  execute on function public.reiniciar_folio_si_vacio() to service_role;

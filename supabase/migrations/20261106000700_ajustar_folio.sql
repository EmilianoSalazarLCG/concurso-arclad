-- =============================================================================
-- Ajusta el consecutivo de folio a (folio más alto + 1).
-- Útil tras borrar propuestas de prueba que tenían los folios más altos: evita
-- huecos al final sin tocar ningún folio existente. Solo service role.
-- =============================================================================

create or replace function public.ajustar_folio()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_siguiente integer;
begin
  select coalesce(max(folio), 0) + 1 into v_siguiente from public.propuestas;
  perform setval(pg_get_serial_sequence('public.propuestas', 'folio'), v_siguiente, false);
  return v_siguiente;
end;
$$;

revoke execute on function public.ajustar_folio() from public, anon, authenticated;
grant  execute on function public.ajustar_folio() to service_role;

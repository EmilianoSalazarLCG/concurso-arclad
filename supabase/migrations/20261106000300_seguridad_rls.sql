-- =============================================================================
-- Seguridad: RLS en todas las tablas
-- - anon (navegador sin sesión): sin acceso a ninguna tabla.
-- - authenticated: solo si está en public.admins (función es_admin()).
-- - Votos de gerentes: solo desde el servidor con service role (ignora RLS).
-- =============================================================================

-- ¿El usuario autenticado actual es admin?
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

revoke execute on function public.es_admin() from public, anon;
grant  execute on function public.es_admin() to authenticated, service_role;

revoke execute on function public.buscar_posibles_duplicados(text, text, uuid) from public, anon;
grant  execute on function public.buscar_posibles_duplicados(text, text, uuid) to authenticated, service_role;

-- RLS activado en todas las tablas --------------------------------------------
alter table public.admins           enable row level security;
alter table public.propuestas       enable row level security;
alter table public.criterios        enable row level security;
alter table public.rondas           enable row level security;
alter table public.ronda_propuestas enable row level security;
alter table public.calificaciones   enable row level security;

-- El rol anon no tiene ningún privilegio sobre tablas ni vistas del esquema public.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- admins: cada admin puede ver la lista (no se edita desde la app) --------------
create policy "admins: lectura para admins"
  on public.admins for select to authenticated
  using ((select public.es_admin()));

-- propuestas: admins crean, leen y editan (descartar = estado 'descartada') -----
-- No hay política de DELETE: las propuestas no se borran, se descartan.
create policy "propuestas: lectura para admins"
  on public.propuestas for select to authenticated
  using ((select public.es_admin()));

create policy "propuestas: alta por admins"
  on public.propuestas for insert to authenticated
  with check ((select public.es_admin()) and created_by = (select auth.uid()));

create policy "propuestas: edición por admins"
  on public.propuestas for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- criterios: lectura para admins (los cambios se hacen por migración) -----------
create policy "criterios: lectura para admins"
  on public.criterios for select to authenticated
  using ((select public.es_admin()));

-- rondas: admins leen y abren/cierran -------------------------------------------
create policy "rondas: lectura para admins"
  on public.rondas for select to authenticated
  using ((select public.es_admin()));

create policy "rondas: abrir/cerrar por admins"
  on public.rondas for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- ronda_propuestas: admins definen qué propuestas participan en cada ronda ------
create policy "ronda_propuestas: lectura para admins"
  on public.ronda_propuestas for select to authenticated
  using ((select public.es_admin()));

create policy "ronda_propuestas: alta por admins"
  on public.ronda_propuestas for insert to authenticated
  with check ((select public.es_admin()));

create policy "ronda_propuestas: edición por admins"
  on public.ronda_propuestas for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy "ronda_propuestas: baja por admins"
  on public.ronda_propuestas for delete to authenticated
  using ((select public.es_admin()));

-- calificaciones: admins solo leen (para resultados). Las escrituras se hacen
-- únicamente desde el servidor con service role, que ignora RLS.
create policy "calificaciones: lectura para admins"
  on public.calificaciones for select to authenticated
  using ((select public.es_admin()));

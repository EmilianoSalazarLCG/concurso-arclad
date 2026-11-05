-- =============================================================================
-- Storage: bucket privado "logos" (PNG/JPG, máx. 5 MB)
-- Las imágenes se muestran con URLs firmadas generadas en el servidor.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', false, 5242880, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Solo admins pueden subir, ver (para firmar URLs), reemplazar o borrar logos.
-- No hay políticas para anon: el navegador nunca accede al bucket directamente.
create policy "logos: lectura para admins"
  on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (select public.es_admin()));

create policy "logos: alta por admins"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (select public.es_admin()));

create policy "logos: edición por admins"
  on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (select public.es_admin()))
  with check (bucket_id = 'logos' and (select public.es_admin()));

create policy "logos: baja por admins"
  on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (select public.es_admin()));

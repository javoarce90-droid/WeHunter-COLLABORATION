-- Fix: subir el CV global de perfil (path `profiles/{userId}/...`, migración 0022) rompía con
-- "invalid input syntax for type uuid: profiles". Causa: las políticas `cvs_tenant_*` de la
-- migración 0002 siguen activas sobre TODO el bucket `cvs` y intentan castear el primer
-- segmento del path a uuid sin chequear que sea un path de organization_id. Postgres evalúa
-- las políticas permissive combinadas con OR, y el cast inválido revienta antes de llegar a
-- evaluar la política `cvs_candidate_*` que sí matchea. Se agrega el guard `<> 'profiles'`
-- (AND hace short-circuit) para que el cast solo se intente en paths de tenant.
drop policy if exists "cvs_tenant_insert" on storage.objects;
--> statement-breakpoint
create policy "cvs_tenant_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cvs'
    and (storage.foldername(name))[1] <> 'profiles'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
--> statement-breakpoint

drop policy if exists "cvs_tenant_select" on storage.objects;
--> statement-breakpoint
create policy "cvs_tenant_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvs'
    and (storage.foldername(name))[1] <> 'profiles'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
--> statement-breakpoint

drop policy if exists "cvs_tenant_update" on storage.objects;
--> statement-breakpoint
create policy "cvs_tenant_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'cvs'
    and (storage.foldername(name))[1] <> 'profiles'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
--> statement-breakpoint

drop policy if exists "cvs_tenant_delete" on storage.objects;
--> statement-breakpoint
create policy "cvs_tenant_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'cvs'
    and (storage.foldername(name))[1] <> 'profiles'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

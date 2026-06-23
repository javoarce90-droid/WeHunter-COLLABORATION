-- Storage de CVs del pool de candidatos (Slice 3 del flujo Reclutador).
-- Provisiona el bucket privado `cvs` y sus políticas RLS por tenant. Versionado acá para
-- que el repo sea la fuente de verdad (reproducible en cualquier entorno), igual que 0001.
-- ZONA COMPARTIDA (src/db): coordinado antes de mergear.
--
-- Aislamiento: cada CV se guarda como `{organization_id}/{uuid}.{ext}`, así que el primer
-- segmento del path (`storage.foldername(name))[1]`) es el organization_id. Reutilizamos el
-- helper public.is_org_member(uuid) de la migración 0001 (SECURITY DEFINER, no recursivo).

-- =========================================================================
-- 1. Bucket privado `cvs`. Idempotente: si ya se creó a mano en el panel, no falla.
--    Privado a propósito: un CV es dato personal; nunca se sirve público. El acceso
--    de lectura es solo vía signed URL de vida corta generada en el server.
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;
--> statement-breakpoint

-- =========================================================================
-- 2. RLS por tenant sobre storage.objects (acotado al bucket `cvs`).
--    storage.objects ya tiene RLS habilitado por Supabase. Estas políticas solo se
--    evalúan cuando ocurre una operación de Storage (subir / firmar), nunca al navegar.
-- =========================================================================
drop policy if exists "cvs_tenant_insert" on storage.objects;
--> statement-breakpoint
create policy "cvs_tenant_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cvs'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
--> statement-breakpoint

drop policy if exists "cvs_tenant_select" on storage.objects;
--> statement-breakpoint
create policy "cvs_tenant_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvs'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
--> statement-breakpoint

drop policy if exists "cvs_tenant_update" on storage.objects;
--> statement-breakpoint
create policy "cvs_tenant_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'cvs'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
--> statement-breakpoint

drop policy if exists "cvs_tenant_delete" on storage.objects;
--> statement-breakpoint
create policy "cvs_tenant_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'cvs'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

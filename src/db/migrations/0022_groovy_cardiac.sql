ALTER TABLE "profiles" ADD COLUMN "cv_url" text;
--> statement-breakpoint

-- Políticas para que candidatos puedan subir su CV global en el bucket privado cvs bajo el path 'profiles/{userId}/filename'
drop policy if exists "cvs_candidate_insert" on storage.objects;
--> statement-breakpoint
create policy "cvs_candidate_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cvs'
    and (storage.foldername(name))[1] = 'profiles'
    and ((storage.foldername(name))[2])::uuid = auth.uid()
  );
--> statement-breakpoint

drop policy if exists "cvs_candidate_select" on storage.objects;
--> statement-breakpoint
create policy "cvs_candidate_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvs'
    and (storage.foldername(name))[1] = 'profiles'
    and ((storage.foldername(name))[2])::uuid = auth.uid()
  );
--> statement-breakpoint

drop policy if exists "cvs_candidate_update" on storage.objects;
--> statement-breakpoint
create policy "cvs_candidate_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'cvs'
    and (storage.foldername(name))[1] = 'profiles'
    and ((storage.foldername(name))[2])::uuid = auth.uid()
  );
--> statement-breakpoint

drop policy if exists "cvs_candidate_delete" on storage.objects;
--> statement-breakpoint
create policy "cvs_candidate_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'cvs'
    and (storage.foldername(name))[1] = 'profiles'
    and ((storage.foldername(name))[2])::uuid = auth.uid()
  );
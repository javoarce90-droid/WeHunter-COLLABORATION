-- =========================================================================
-- Dos fixes sobre apply_to_career_site_job (0030), mismo create or replace para no dejar dos
-- migraciones pisándose la misma función:
--
-- 1. Bug: "pipeline duplica candidatos". El chequeo `if exists(...) then raise` antes del
--    insert no es atómico — dos requests casi simultáneos pueden pasar el check antes de que el
--    primero commitee. Ahora hay un índice único (applications_job_candidate_unique, 0042) de
--    respaldo; acá se agrega el manejo de esa excepción para que el candidato vea el mismo
--    mensaje de error en vez de un 500 crudo de Postgres.
-- 2. Bug: scoring de IA ve "sin resumen/skills" en candidatos con cuenta vinculada que se
--    autopostularon por Career Site. Causa: esta función nunca copiaba bio/skills de `profiles`
--    a `candidates` al crear/vincular la fila (solo copiaba full_name/email/phone/cv_url). Se
--    agrega el mismo criterio coalesce que ya usa para phone/cv_url.
-- =========================================================================
create or replace function public.apply_to_career_site_job(
  p_job_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_cover_note text,
  p_cv_path text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job record;
  v_profile record;
  v_candidate_id uuid;
  v_application_id uuid;
begin
  if auth.uid() is null then
    raise exception 'forbidden: se requiere sesión para postularse';
  end if;

  select id, organization_id, status
  into v_job
  from public.jobs
  where id = p_job_id;

  if not found or v_job.status <> 'open' then
    raise exception 'invalid: la búsqueda no existe o no está abierta';
  end if;

  if not exists (
    select 1 from public.organizations
    where id = v_job.organization_id and career_site_enabled = true
  ) then
    raise exception 'invalid: el career site de esta organización no está habilitado';
  end if;

  select bio, skills into v_profile from public.profiles where id = auth.uid();

  -- Enlazar, no duplicar (docs/DATA_MODEL.md): primero por cuenta ya vinculada, si no por
  -- email dentro de la misma org (candidato fantasma cargado a mano por el recruiter).
  select id into v_candidate_id
  from public.candidates
  where organization_id = v_job.organization_id
    and (
      profile_id = auth.uid()
      or (profile_id is null and lower(email) = lower(p_email))
    )
  order by (profile_id = auth.uid()) desc
  limit 1;

  if v_candidate_id is null then
    insert into public.candidates (
      organization_id, profile_id, full_name, email, phone, cv_url, summary, skills
    )
    values (
      v_job.organization_id, auth.uid(), p_full_name, p_email, p_phone, p_cv_path,
      v_profile.bio, v_profile.skills
    )
    returning id into v_candidate_id;
  else
    update public.candidates
    set profile_id = auth.uid(),
        cv_url = coalesce(p_cv_path, cv_url),
        phone = coalesce(p_phone, phone),
        summary = coalesce(v_profile.bio, summary),
        skills = coalesce(v_profile.skills, skills)
    where id = v_candidate_id;
  end if;

  if exists (
    select 1 from public.applications
    where job_id = p_job_id and candidate_id = v_candidate_id
  ) then
    raise exception 'invalid: ya te postulaste a esta búsqueda';
  end if;

  begin
    insert into public.applications (organization_id, job_id, candidate_id, stage, cover_note)
    values (v_job.organization_id, p_job_id, v_candidate_id, 'new', p_cover_note)
    returning id into v_application_id;
  exception
    when unique_violation then
      raise exception 'invalid: ya te postulaste a esta búsqueda';
  end;

  insert into public.application_events (organization_id, application_id, from_stage, to_stage, changed_by)
  values (v_job.organization_id, v_application_id, null, 'new', auth.uid());

  return json_build_object('applicationId', v_application_id, 'candidateId', v_candidate_id);
end;
$$;
--> statement-breakpoint

grant execute on function public.apply_to_career_site_job(uuid, text, text, text, text, text) to authenticated;
--> statement-breakpoint

-- =========================================================================
-- Bug: "no se puede ver el CV" en la ficha del candidato con cuenta vinculada. Las políticas
-- cvs_candidate_* (0022) solo dejan leer un CV bajo `profiles/{userId}/...` al propio dueño
-- (auth.uid() = userId) — un recruiter nunca podía generarle una signed URL, aunque
-- get_linked_candidate_profile (0029) sí expusiera el path. Política adicional (permissive,
-- se combina con OR): un recruiter miembro de la organization puede leer el CV de
-- profiles/{userId}/... si ese userId es el profile_id de un candidato de su organization.
-- =========================================================================
drop policy if exists "cvs_linked_candidate_select" on storage.objects;
--> statement-breakpoint
create policy "cvs_linked_candidate_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvs'
    and (storage.foldername(name))[1] = 'profiles'
    and exists (
      select 1 from public.candidates c
      where c.profile_id = ((storage.foldername(name))[2])::uuid
        and public.is_org_member(c.organization_id)
    )
  );

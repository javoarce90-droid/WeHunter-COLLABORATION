-- CV y teléfono dejan de ser obligatorios para postularse (candidate/applications).
-- Antes esta función siempre recibía p_cv_path (subida nueva o el cv_url ya existente del
-- candidato) y lo pisaba sin condición; ahora p_cv_path puede venir null (el candidato no
-- tiene CV cargado y no quiso subir uno), así que en el UPDATE hay que preservar el cv_url
-- existente con coalesce — mismo criterio que ya usa p_phone — para no borrar un CV real
-- solo porque esta postulación puntual no volvió a mandarlo.
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
    insert into public.candidates (organization_id, profile_id, full_name, email, phone, cv_url)
    values (v_job.organization_id, auth.uid(), p_full_name, p_email, p_phone, p_cv_path)
    returning id into v_candidate_id;
  else
    update public.candidates
    set profile_id = auth.uid(),
        cv_url = coalesce(p_cv_path, cv_url),
        phone = coalesce(p_phone, phone)
    where id = v_candidate_id;
  end if;

  if exists (
    select 1 from public.applications
    where job_id = p_job_id and candidate_id = v_candidate_id
  ) then
    raise exception 'invalid: ya te postulaste a esta búsqueda';
  end if;

  insert into public.applications (organization_id, job_id, candidate_id, stage, cover_note)
  values (v_job.organization_id, p_job_id, v_candidate_id, 'new', p_cover_note)
  returning id into v_application_id;

  insert into public.application_events (organization_id, application_id, from_stage, to_stage, changed_by)
  values (v_job.organization_id, v_application_id, null, 'new', auth.uid());

  return json_build_object('applicationId', v_application_id, 'candidateId', v_candidate_id);
end;
$$;
--> statement-breakpoint

grant execute on function public.apply_to_career_site_job(uuid, text, text, text, text, text) to authenticated;

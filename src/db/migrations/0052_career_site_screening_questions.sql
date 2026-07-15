-- §6 backlog: preguntas de screening por búsqueda + respuestas del candidato al postularse.
-- Dos funciones SECURITY DEFINER a tocar (mismo patrón que 0021/0043/0045):
--   1. get_career_site_job: agrega las preguntas de la búsqueda al JSON público (el candidato
--      necesita verlas para poder responderlas en /careers/{slug}/{jobId}/postular).
--   2. apply_to_career_site_job: nuevo parámetro p_screening_answers (jsonb), inserta las
--      respuestas ligadas a la application recién creada. NO valida "obligatorias respondidas"
--      acá — eso queda como validación de UI (HTML required en ApplyForm), no como gate de
--      seguridad: el screening es dato de negocio, no aislamiento entre tenants, así que no
--      amerita el mismo nivel de enforcement que RLS/autorización.

create or replace function public.get_career_site_job(p_slug text, p_job_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org record;
  v_job record;
  v_result json;
begin
  select id, name, slug, logo_url, career_site_cover_url, career_site_settings
  into v_org
  from public.organizations
  where slug = p_slug
    and career_site_enabled = true;

  if not found then
    return null;
  end if;

  select *
  into v_job
  from public.jobs
  where id = p_job_id
    and organization_id = v_org.id
    and status = 'open';

  if not found then
    return null;
  end if;

  select json_build_object(
    'organization', json_build_object(
      'organizationId', v_org.id,
      'name', v_org.name,
      'slug', v_org.slug,
      'logoUrl', v_org.logo_url,
      'coverUrl', v_org.career_site_cover_url,
      'settings', v_org.career_site_settings
    ),
    'job', json_build_object(
      'id', v_job.id,
      'title', v_job.title,
      'position', v_job.position,
      'jobArea', v_job.job_area,
      'location', v_job.location,
      'modality', v_job.modality,
      'seniority', v_job.seniority,
      'employmentType', v_job.employment_type,
      'salaryMin', v_job.salary_min,
      'salaryMax', v_job.salary_max,
      'salaryCurrency', v_job.salary_currency,
      'skills', v_job.skills,
      'objectives', v_job.objectives,
      'requirements', v_job.requirements,
      'responsibilities', v_job.responsibilities,
      'benefits', v_job.benefits,
      'screeningQuestions', coalesce((
        select json_agg(
          json_build_object(
            'id', sq.id,
            'type', sq.type,
            'label', sq.label,
            'options', sq.options,
            'required', sq.required
          ) order by sq.position
        )
        from public.screening_questions sq
        where sq.job_id = v_job.id
      ), '[]'::json),
      'createdAt', v_job.created_at
    )
  ) into v_result;

  return v_result;
end;
$$;
--> statement-breakpoint

grant execute on function public.get_career_site_job(text, uuid) to anon, authenticated;
--> statement-breakpoint

-- Cambia de firma (agrega p_screening_answers): create or replace no alcanza para eso, hay
-- que dropear la versión vieja de 6 argumentos para no dejar un overload muerto.
drop function if exists public.apply_to_career_site_job(uuid, text, text, text, text, text);
--> statement-breakpoint

create or replace function public.apply_to_career_site_job(
  p_job_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_cover_note text,
  p_cv_path text,
  p_screening_answers jsonb default '[]'::jsonb
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

  -- Respuestas de screening: solo las que corresponden a preguntas reales de ESTA búsqueda
  -- (filtro defensivo — ignora ids que no pertenezcan a p_job_id en vez de fallar).
  insert into public.screening_answers (organization_id, application_id, question_id, value)
  select v_job.organization_id, v_application_id, sq.id, trim(a->>'value')
  from jsonb_array_elements(p_screening_answers) a
  join public.screening_questions sq
    on sq.id = (a->>'questionId')::uuid
   and sq.job_id = p_job_id
  where trim(a->>'value') <> '';

  return json_build_object('applicationId', v_application_id, 'candidateId', v_candidate_id);
end;
$$;
--> statement-breakpoint

grant execute on function public.apply_to_career_site_job(uuid, text, text, text, text, text, jsonb) to authenticated;
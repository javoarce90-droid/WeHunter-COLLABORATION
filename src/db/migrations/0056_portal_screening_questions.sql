-- =========================================================================
-- Screening en la postulación rápida del portal (§6 backlog).
--
-- Dos cambios:
--   1. get_portal_jobs: devuelve screeningQuestions, igual que ya hace get_career_site_job
--      (0052). Sin esto el modal del portal no tiene qué renderizar. Mismo criterio que la
--      0031, que ya sumó los campos ricos de la JD a esta misma función porque el modal de
--      detalle los necesitaba.
--   2. apply_to_career_site_job: pasa a EXIGIR respuesta en las preguntas obligatorias.
--      Hasta ahora "obligatoria" era solo `required` de HTML — el servidor aceptaba la
--      postulación igual si el candidato no las respondía. Va acá, y no solo en el dominio,
--      porque es el único punto por el que pasan los dos flujos (Career Site y portal) y
--      porque es el que tiene las preguntas a mano sin una query extra.
-- =========================================================================

create or replace function public.get_portal_jobs()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(
    json_build_object(
      'id', j.id,
      'title', j.title,
      'position', j.position,
      'jobArea', j.job_area,
      'location', j.location,
      'modality', j.modality,
      'seniority', j.seniority,
      'employmentType', j.employment_type,
      'vacancies', j.vacancies,
      'salaryMin', j.salary_min,
      'salaryMax', j.salary_max,
      'salaryCurrency', j.salary_currency,
      'skills', j.skills,
      'objectives', j.objectives,
      'requirements', j.requirements,
      'responsibilities', j.responsibilities,
      'benefits', j.benefits,
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
        where sq.job_id = j.id
      ), '[]'::json),
      'createdAt', j.created_at,
      'organization', json_build_object(
        'organizationId', o.id,
        'name', o.name,
        'slug', o.slug,
        'logoUrl', o.logo_url
      )
    ) order by j.created_at desc
  ), '[]'::json)
  from public.jobs j
  join public.organizations o on o.id = j.organization_id
  where j.status = 'open'
    and o.career_site_enabled = true;
$$;
--> statement-breakpoint

grant execute on function public.get_portal_jobs() to authenticated;
--> statement-breakpoint

-- Mismo cuerpo que la 0052 + el bloque nuevo de validación de obligatorias. El prefijo
-- `screening:` del mensaje es el contrato con la capa data (apply.data.ts), que lo traduce a
-- un error propio para poder mostrarle al candidato qué le falta en vez del genérico
-- "puede que ya te hayas postulado".
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
  v_faltantes text;
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

  -- Obligatorias sin respuesta (o con respuesta en blanco). Se evalúa contra las preguntas
  -- reales de ESTA búsqueda, así el cliente no puede omitir una mandando menos respuestas.
  select string_agg(sq.label, ', ' order by sq.position)
  into v_faltantes
  from public.screening_questions sq
  where sq.job_id = p_job_id
    and sq.required = true
    and not exists (
      select 1
      from jsonb_array_elements(p_screening_answers) a
      where (a->>'questionId')::uuid = sq.id
        and trim(coalesce(a->>'value', '')) <> ''
    );

  if v_faltantes is not null then
    raise exception 'screening: faltan respuestas obligatorias (%)', v_faltantes;
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

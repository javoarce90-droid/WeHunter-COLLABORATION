-- =========================================================================
-- apply_to_career_site_job_anon: postulación desde el Career Site público SIN cuenta.
--
-- Gemela de apply_to_career_site_job (última versión en 0082), con estas diferencias:
--   · NO exige auth.uid() — el postulante es un visitante anónimo. La "autorización" es
--     que el job pertenezca a un Career Site público y habilitado, y que esté abierto:
--     todo eso lo valida esta misma función (SECURITY DEFINER). La llama la capa server
--     con el service client, DESPUÉS de honeypot + rate-limit por IP (ver actions.ts),
--     mismo criterio que submit_shortlist_feedback / aceptar invitación de equipo.
--   · El candidato nace con profile_id = NULL (nadie está logueado). Si más adelante esa
--     persona se registra con el mismo email, el flujo autenticado la enlaza por email
--     ("enlazar, no duplicar").
--   · Solo matchea/actualiza candidatos fantasma (profile_id IS NULL) por email — nunca
--     pisa un candidato ya vinculado a una cuenta.
--   · Persiste p_location (dato mínimo obligatorio del form anónimo).
--   · application_events.changed_by = NULL (no hay actor con cuenta).
--   · No copia bio/skills de profiles (no hay profile).
--
-- Igual que la autenticada: valida job abierto + Career Site habilitado, exige respuesta
-- en las preguntas obligatorias reales de la búsqueda, dedupe por (job, candidate),
-- source = 'portal', saved_to_pool = false (nace fuera del Talent Pool), self_applied = true.
-- =========================================================================
create or replace function public.apply_to_career_site_job_anon(
  p_job_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_location text,
  p_cover_note text,
  p_cv_path text,
  p_screening_answers jsonb default '[]'::jsonb,
  p_expected_salary integer default null,
  p_expected_salary_currency text default null
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
  v_faltantes text;
begin
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

  -- Enlazar, no duplicar: solo candidatos fantasma (sin cuenta) de la misma org, por email.
  select id into v_candidate_id
  from public.candidates
  where organization_id = v_job.organization_id
    and profile_id is null
    and lower(email) = lower(p_email)
  limit 1;

  if v_candidate_id is null then
    insert into public.candidates (
      organization_id, profile_id, full_name, email, phone, location, cv_url,
      source, saved_to_pool
    )
    values (
      v_job.organization_id, null, p_full_name, p_email, p_phone, p_location, p_cv_path,
      'portal', false
    )
    returning id into v_candidate_id;
  else
    update public.candidates
    set cv_url = coalesce(p_cv_path, cv_url),
        phone = coalesce(p_phone, phone),
        location = coalesce(p_location, location)
    where id = v_candidate_id;
  end if;

  if exists (
    select 1 from public.applications
    where job_id = p_job_id and candidate_id = v_candidate_id
  ) then
    raise exception 'invalid: ya te postulaste a esta búsqueda';
  end if;

  begin
    insert into public.applications (
      organization_id, job_id, candidate_id, stage, cover_note,
      expected_salary, expected_salary_currency, self_applied
    )
    values (
      v_job.organization_id, p_job_id, v_candidate_id, 'new', p_cover_note,
      p_expected_salary, p_expected_salary_currency, true
    )
    returning id into v_application_id;
  exception
    when unique_violation then
      raise exception 'invalid: ya te postulaste a esta búsqueda';
  end;

  insert into public.application_events (organization_id, application_id, from_stage, to_stage, changed_by)
  values (v_job.organization_id, v_application_id, null, 'new', null);

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

-- Solo el service role la ejecuta (la capa server, tras honeypot + rate-limit). No se
-- expone a anon ni a authenticated: el flujo autenticado usa apply_to_career_site_job.
revoke all on function public.apply_to_career_site_job_anon(
  uuid, text, text, text, text, text, text, jsonb, integer, text
) from public;

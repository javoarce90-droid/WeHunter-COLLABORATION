-- =========================================================================
-- Revierte el trigger de 0044. Motivo: candidates.summary/skills/cv_url son las MISMAS
-- columnas que lee la ficha principal del recruiter (/candidates/[id]), que tiene una
-- separación deliberada ("nunca reemplaza ni fusiona lo que el recruiter ya cargó"). El
-- trigger, al pisar esas columnas siempre que profiles cambia, terminaba cambiando también lo
-- que la ficha muestra — efecto colateral no querido, la ficha debía quedar intacta.
--
-- Vuelta al diseño correcto: candidates sigue existiendo (no puede ser solo un link — la
-- mayoría de los candidatos de un recruiter no tienen cuenta/profiles, y el aislamiento por
-- organization_id exige una fila propia por org). Para el scoring de IA específicamente
-- (el único lugar que necesitaba "profiles siempre gana"), se vuelve a leer profiles con un
-- join en el momento de puntuar, sin tocar nunca las columnas de candidates.
-- =========================================================================
drop trigger if exists sync_candidates_from_profile_trigger on public.profiles;
--> statement-breakpoint

drop function if exists public.sync_candidates_from_profile();
--> statement-breakpoint

-- apply_to_career_site_job vuelve a la versión de 0043: summary/skills con coalesce (solo
-- completa si candidates estaba vacío, no pisa lo que el recruiter ya haya cargado a mano) —
-- 0044 lo había cambiado a asignación directa, ya no hace falta porque el scoring no depende
-- más de esta columna para candidatos vinculados.
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

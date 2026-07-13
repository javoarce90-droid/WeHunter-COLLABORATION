-- =========================================================================
-- Bug scoring IA (continuación de 0043): la sincronización de bio/skills/CV en
-- apply_to_career_site_job solo corre AL MOMENTO de postularse — es una foto, no un espejo.
-- Si el candidato edita su perfil real después (/c/profile), `candidates` en las orgs donde
-- ya se postuló antes vuelve a quedar desactualizado, mismo bug de nuevo.
--
-- Fix: trigger en `profiles` que mantiene `candidates.summary/skills/cv_url` siempre al día
-- para cualquier fila vinculada (profile_id). Decisión de producto confirmada: profiles es la
-- fuente de verdad para candidatos vinculados — el trigger pisa SIEMPRE, incluso si el
-- recruiter había editado esos campos a mano para ese candidato. No aplica a candidatos sin
-- cuenta vinculada (profile_id null), esos siguen siendo 100% del recruiter.
-- =========================================================================
create or replace function public.sync_candidates_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.candidates
  set summary = new.bio,
      skills = new.skills,
      cv_url = new.cv_url
  where profile_id = new.id;
  return new;
end;
$$;
--> statement-breakpoint

drop trigger if exists sync_candidates_from_profile_trigger on public.profiles;
--> statement-breakpoint

create trigger sync_candidates_from_profile_trigger
after update of bio, skills, cv_url on public.profiles
for each row
when (
  new.bio is distinct from old.bio
  or new.skills is distinct from old.skills
  or new.cv_url is distinct from old.cv_url
)
execute function public.sync_candidates_from_profile();
--> statement-breakpoint

-- Ajuste a apply_to_career_site_job (0043): ahora que "profiles siempre gana" es la regla
-- general (vía este trigger), la sincronización al postularse deja de usar coalesce para
-- summary/skills — asignación directa, consistente con el trigger. cv_url/phone siguen con
-- coalesce: son datos específicos de ESTA postulación (puede o no incluir un CV/teléfono nuevo
-- en el form), no un espejo de profiles.
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
        summary = v_profile.bio,
        skills = v_profile.skills
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

-- Backfill único: candidatos YA vinculados hoy (ej. el caso reportado con captura) cuyo
-- candidates.summary/skills/cv_url quedaron vacíos porque se vincularon antes de este fix.
-- A diferencia del trigger (que siempre pisa), acá usamos coalesce — es una corrida masiva
-- de una sola vez sobre datos existentes, más conservador: solo completa lo que está vacío,
-- no reemplaza algo que el recruiter ya haya cargado a mano.
update public.candidates c
set summary = coalesce(c.summary, p.bio),
    skills = coalesce(c.skills, p.skills),
    cv_url = coalesce(c.cv_url, p.cv_url)
from public.profiles p
where c.profile_id = p.id
  and (c.summary is null or c.skills is null or c.cv_url is null);

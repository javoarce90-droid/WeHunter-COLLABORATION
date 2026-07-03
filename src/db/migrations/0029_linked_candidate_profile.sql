-- Permite que un recruiter vea (solo lectura) el perfil real de un candidato de su pool
-- una vez que se registró y su candidates.profile_id quedó vinculado. RLS de profiles/las
-- 3 tablas de currículum solo deja ver al propio dueño (profile_id = auth.uid()) — un
-- recruiter no puede leerlas directo. Mismo patrón que get_portal_jobs/get_my_applications:
-- una función SECURITY DEFINER audita la autorización (is_org_member sobre el candidate_id
-- que dice tener vinculado ese profile) y expone solo lo necesario para mostrar, nunca para
-- fusionar ni sobreescribir lo que el recruiter ya tiene cargado.
create or replace function public.get_linked_candidate_profile(p_candidate_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_candidate record;
  v_profile record;
  v_result json;
begin
  select id, organization_id, profile_id
  into v_candidate
  from public.candidates
  where id = p_candidate_id;

  if not found or v_candidate.profile_id is null then
    return null;
  end if;

  if not public.is_org_member(v_candidate.organization_id) then
    raise exception 'forbidden: no pertenecés a la organization de este candidato';
  end if;

  select id, full_name, email, headline, location, linkedin_url, bio, cv_url, skills
  into v_profile
  from public.profiles
  where id = v_candidate.profile_id;

  if not found then
    return null;
  end if;

  select json_build_object(
    'fullName', v_profile.full_name,
    'email', v_profile.email,
    'headline', v_profile.headline,
    'location', v_profile.location,
    'linkedinUrl', v_profile.linkedin_url,
    'bio', v_profile.bio,
    'cvUrl', v_profile.cv_url,
    'skills', v_profile.skills,
    'experiences', coalesce((
      select json_agg(json_build_object(
        'id', e.id, 'company', e.company, 'position', e.position,
        'startDate', e.start_date, 'endDate', e.end_date, 'description', e.description,
        'employmentType', e.employment_type, 'modality', e.modality
      ) order by e.start_date desc nulls last)
      from public.candidate_work_experiences e
      where e.profile_id = v_profile.id
    ), '[]'::json),
    'education', coalesce((
      select json_agg(json_build_object(
        'id', ed.id, 'institution', ed.institution, 'degree', ed.degree,
        'fieldOfStudy', ed.field_of_study, 'startDate', ed.start_date, 'endDate', ed.end_date,
        'description', ed.description, 'grade', ed.grade, 'activities', ed.activities
      ) order by ed.start_date desc nulls last)
      from public.candidate_education ed
      where ed.profile_id = v_profile.id
    ), '[]'::json),
    'certifications', coalesce((
      select json_agg(json_build_object('id', c.id, 'name', c.name, 'url', c.url))
      from public.candidate_certifications c
      where c.profile_id = v_profile.id
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;
--> statement-breakpoint

grant execute on function public.get_linked_candidate_profile(uuid) to authenticated;

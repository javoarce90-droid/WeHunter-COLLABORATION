-- get_my_applications() (0026) no traía jobArea/seniority/employmentType/vacancies/
-- requirements/responsibilities/benefits — el panel de detalle de "mis postulaciones" los
-- necesita para mostrar la misma información completa que ya expone el modal del portal
-- (get_portal_jobs, 0031). Mismo criterio de exposición pública.
create or replace function public.get_my_applications()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(
    json_build_object(
      'applicationId', a.id,
      'jobId', a.job_id,
      'jobTitle', j.title,
      'company', o.name,
      'appliedAt', a.created_at,
      'stage', a.stage,
      'fullName', c.full_name,
      'cvUrl', c.cv_url,
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
      'benefits', j.benefits
    ) order by a.created_at desc
  ), '[]'::json)
  from public.applications a
  join public.candidates c on c.id = a.candidate_id
  join public.jobs j on j.id = a.job_id
  join public.organizations o on o.id = a.organization_id
  where c.profile_id = auth.uid();
$$;
--> statement-breakpoint

grant execute on function public.get_my_applications() to authenticated;

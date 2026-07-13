-- get_portal_jobs() no traía vacancies/requirements/responsibilities/benefits — el modal de
-- detalle del portal los necesita para mostrar la búsqueda completa (no solo objectives).
-- Mismo set de campos que ya expone get_career_site_job (0021), + vacancies para paridad.
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

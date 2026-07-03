-- get_portal_jobs() (0023) no incluía 'objectives' (el copy público del aviso), necesario para
-- la preview de la oferta en el portal. Se redefine con ese campo agregado — mismo criterio
-- que el resto de las funciones públicas: solo copy destinado a mostrarse, nunca 'description'
-- (ese es el brief interno del recruiter, nunca se expone).
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
      'salaryMin', j.salary_min,
      'salaryMax', j.salary_max,
      'salaryCurrency', j.salary_currency,
      'skills', j.skills,
      'objectives', j.objectives,
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

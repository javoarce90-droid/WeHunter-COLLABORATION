-- "Mis postulaciones" del candidato cruza organizations/jobs, y esas tablas solo son
-- legibles por RLS para miembros de la org (tenant_isolation) — el candidato no lo es.
-- Mismo criterio que get_portal_jobs/get_career_site: una función SECURITY DEFINER
-- resuelve el join, sin abrir RLS de jobs/organizations a cualquier autenticado.
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
      'cvUrl', c.cv_url
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

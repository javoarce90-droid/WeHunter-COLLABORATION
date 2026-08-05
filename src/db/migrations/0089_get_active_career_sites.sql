-- Primera lectura pública CROSS-ORG del proyecto (toda otra query es single-org, ver
-- .claude/rules/database.md). Sigue el mismo patrón de seguridad que get_career_site (0021):
-- SECURITY DEFINER, whitelist explícita de columnas — nunca expone más de lo que ya es público
-- individualmente por URL directa (career_site_enabled=true). Usada en el empty state del
-- Career Site público, cuando una org no tiene búsquedas abiertas, para sugerir otras orgs de
-- WeHunter que sí tienen (excluye orgs sin búsquedas abiertas: mostrarlas sería el mismo
-- problema que se está resolviendo).
create or replace function public.get_active_career_sites(p_exclude_org_id uuid, p_limit int default 6)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  select coalesce(json_agg(row_to_json(t)), '[]'::json)
  into v_result
  from (
    select
      o.id as "organizationId",
      o.name,
      o.slug,
      o.logo_url as "logoUrl",
      count(j.id)::int as "openJobsCount"
    from public.organizations o
    join public.jobs j on j.organization_id = o.id and j.status = 'open'
    where o.career_site_enabled = true
      and o.id != p_exclude_org_id
    group by o.id, o.name, o.slug, o.logo_url
    order by count(j.id) desc, o.name asc
    limit p_limit
  ) t;

  return v_result;
end;
$$;
--> statement-breakpoint

grant execute on function public.get_active_career_sites(uuid, int) to anon, authenticated;

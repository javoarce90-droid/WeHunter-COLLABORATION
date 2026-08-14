-- Gate de completitud mínima para la Comunidad (backlog QA ago 2026, card 11.3): además del
-- opt-in explícito (visible_in_community, ver 0100), el perfil solo es elegible si completó
-- nombre + título profesional + bio — evita la vidriera con cards vacías ("Todavía no cargó
-- una biografía") que señaló el feedback. Mismo patrón que 0094, solo se agrega una condición
-- al where interno.
create or replace function public.get_community_profiles()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  select coalesce(json_agg(row_to_json(u) order by u."fullName" asc), '[]'::json)
  into v_result
  from (
    select t.*
    from (
      select distinct on (p.id)
        p.id,
        p.full_name as "fullName",
        p.avatar_url as "avatarUrl",
        p.job_title as "jobTitle",
        p.bio,
        p.linkedin_url as "linkedinUrl",
        p.phone,
        o.name as "organizationName",
        case when o.career_site_enabled then o.slug else null end as "organizationSlug"
      from public.profiles p
      join public.memberships m on m.profile_id = p.id and m.status = 'active'
      join public.organizations o on o.id = m.organization_id
      where p.visible_in_community = true
        and m.role in ('owner', 'admin', 'recruiter', 'consultant')
        and coalesce(btrim(p.full_name), '') <> ''
        and coalesce(btrim(p.job_title), '') <> ''
        and coalesce(btrim(p.bio), '') <> ''
      order by p.id, m.created_at asc
    ) t
    order by t."fullName" asc
    limit 200
  ) u;

  return v_result;
end;
$$;

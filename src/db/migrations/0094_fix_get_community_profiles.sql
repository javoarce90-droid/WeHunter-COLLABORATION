-- Fix de 0093: el `order by`/`limit` para el orden final (por nombre) quedaba pegado al
-- `select json_agg(...)` de afuera, que ya es una agregación sin GROUP BY — Postgres lo
-- rechaza ("column t.fullName must appear in the GROUP BY clause"). Se mueve el orden/límite a
-- una subquery intermedia (una select plana, sin agregación) antes de agregar a json.
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
      order by p.id, m.created_at asc
    ) t
    order by t."fullName" asc
    limit 200
  ) u;

  return v_result;
end;
$$;
--> statement-breakpoint

grant execute on function public.get_community_profiles() to anon, authenticated;

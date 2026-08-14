-- Perfil público individual de la Comunidad (backlog QA ago 2026, card 11.2 CTA "Ver perfil").
-- Mismas condiciones de elegibilidad que get_community_profiles() (0104), pero para un solo id
-- — evita traer y firmar el avatar de 200 perfiles solo para mostrar uno.
create or replace function public.get_community_profile(p_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  select row_to_json(t) into v_result
  from (
    select distinct on (p.id)
      p.id,
      p.full_name as "fullName",
      p.avatar_url as "avatarUrl",
      p.job_title as "jobTitle",
      p.bio,
      p.location,
      p.specialties,
      p.years_of_experience as "yearsOfExperience",
      p.linkedin_url as "linkedinUrl",
      p.phone,
      o.name as "organizationName",
      case when o.career_site_enabled then o.slug else null end as "organizationSlug"
    from public.profiles p
    join public.memberships m on m.profile_id = p.id and m.status = 'active'
    join public.organizations o on o.id = m.organization_id
    where p.id = p_id
      and p.visible_in_community = true
      and m.role in ('owner', 'admin', 'recruiter', 'consultant')
      and coalesce(btrim(p.full_name), '') <> ''
      and coalesce(btrim(p.job_title), '') <> ''
      and coalesce(btrim(p.bio), '') <> ''
    order by p.id, m.created_at asc
  ) t;

  return v_result;
end;
$$;
--> statement-breakpoint

grant execute on function public.get_community_profile(uuid) to anon, authenticated;

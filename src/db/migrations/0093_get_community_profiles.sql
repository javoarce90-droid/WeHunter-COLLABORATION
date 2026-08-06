-- Directorio público (Comunidad WeHunter): recruiters/consultores que activaron "Aparecer en
-- la Comunidad" (profiles.visible_in_community, migración 0087). Mismo patrón que
-- get_active_career_sites (0089): SECURITY DEFINER, whitelist explícita de columnas, cross-org
-- a propósito. Solo expone lo que el propio dueño del perfil eligió hacer público (checkbox en
-- Configuración) + el teléfono, necesario para armar el link de WhatsApp que es el propósito
-- explícito de esta página — nunca se expone si el perfil no lo cargó.
--
-- Roles elegibles: los mismos que tienen la capability `community.appear` en roles.ts
-- (owner, admin, recruiter, consultant). Sourcer/viewer/hiring_manager quedan afuera aunque
-- tuvieran el flag en true (no deberían poder activarlo desde Configuración, esto es una
-- segunda barrera del lado de la base).
--
-- distinct on (p.id): un profile puede tener memberships activos en más de una organización;
-- se muestra una sola card por persona (la de su membership más antiguo). Vidriera simple v1,
-- sin selector de "con cuál organización aparecer".
--
-- limit 200: no hay paginación en la UI todavía (volumen esperado bajo). Si la Comunidad
-- crece más allá de esto, hay que sumar paginación real, no subir el número.
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
  select coalesce(json_agg(row_to_json(t)), '[]'::json)
  into v_result
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
  limit 200;

  return v_result;
end;
$$;
--> statement-breakpoint

grant execute on function public.get_community_profiles() to anon, authenticated;

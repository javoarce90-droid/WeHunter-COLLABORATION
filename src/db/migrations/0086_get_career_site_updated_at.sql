-- Suma `updatedAt` al JSON que devuelve get_career_site (0021_career_site_public_access) para
-- poder cache-bustear la portada pública (?v=<updatedAt>) y remontar el iframe de preview del
-- recruiter después de guardar. Sin esto la portada/preview quedan con la versión vieja
-- cacheada hasta que expira el max-age del bucket público, aunque el server ya haya guardado
-- la imagen nueva.
create or replace function public.get_career_site(p_slug text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org record;
  v_result json;
begin
  select id, name, slug, logo_url, career_site_cover_url, career_site_settings, updated_at
  into v_org
  from public.organizations
  where slug = p_slug
    and career_site_enabled = true;

  if not found then
    return null;
  end if;

  select json_build_object(
    'organizationId', v_org.id,
    'name', v_org.name,
    'slug', v_org.slug,
    'logoUrl', v_org.logo_url,
    'coverUrl', v_org.career_site_cover_url,
    'settings', v_org.career_site_settings,
    'updatedAt', v_org.updated_at,
    'jobs', coalesce((
      select json_agg(
        json_build_object(
          'id', j.id,
          'title', j.title,
          'position', j.position,
          'jobArea', j.job_area,
          'location', j.location,
          'modality', j.modality,
          'seniority', j.seniority,
          'employmentType', j.employment_type,
          'createdAt', j.created_at
        ) order by j.created_at desc
      )
      from public.jobs j
      where j.organization_id = v_org.id
        and j.status = 'open'
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;

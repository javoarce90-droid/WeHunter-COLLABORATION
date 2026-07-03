-- Career Site: micrositio público por workspace (/careers/{slug}). Ver plan en
-- docs/ (sesión 2026-07-01) y docs/DATA_MODEL.md.
-- ZONA COMPARTIDA (src/db): coordinado con Ale antes de mergear.
--
-- Esta migración cubre 3 cosas:
--   1. Bucket público `career-site-media` (logo/portada del Career Site).
--   2. Funciones SECURITY DEFINER de solo-lectura para visitantes SIN sesión (igual patrón
--      que get_shared_shortlist en 0004): nunca exponen candidatos ni datos internos, solo
--      branding + búsquedas abiertas.
--   3. Función SECURITY DEFINER para que un candidato CON sesión (a diferencia de la empresa
--      por token) se postule — toda la autorización real vive acá adentro.

-- =========================================================================
-- 1. Bucket público `career-site-media`. Path: {organization_id}/logo.{ext} y .../cover.{ext}.
--    PÚBLICO a propósito (a diferencia de `org-logos`/`cvs`, privados): og:image/og:title de
--    WhatsApp/LinkedIn necesitan una URL estable sin firmar. Escritura: solo miembros de la
--    org vía el cliente autenticado (igual patrón que cvs/org-logos). Lectura: pública.
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('career-site-media', 'career-site-media', true)
on conflict (id) do nothing;
--> statement-breakpoint

drop policy if exists "career_site_media_public_read" on storage.objects;
--> statement-breakpoint
create policy "career_site_media_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'career-site-media');
--> statement-breakpoint

drop policy if exists "career_site_media_tenant_write" on storage.objects;
--> statement-breakpoint
create policy "career_site_media_tenant_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'career-site-media'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
--> statement-breakpoint

drop policy if exists "career_site_media_tenant_update" on storage.objects;
--> statement-breakpoint
create policy "career_site_media_tenant_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'career-site-media'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
--> statement-breakpoint

drop policy if exists "career_site_media_tenant_delete" on storage.objects;
--> statement-breakpoint
create policy "career_site_media_tenant_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'career-site-media'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
--> statement-breakpoint

-- =========================================================================
-- 2. Lectura pública (sin sesión): branding del workspace + búsquedas abiertas.
--    `logo_url` viaja como PATH crudo del bucket privado `org-logos`, no como URL: quien lo
--    consuma (Fase 3, sin sesión de recruiter) debe firmarlo server-side con el cliente
--    service-role (mismo patrón ya usado para firmar CVs en shortlist-review), NO exponerlo
--    directo. `career_site_cover_url` en cambio ya es un path del bucket PÚBLICO de arriba,
--    se resuelve con getPublicUrl sin firmar.
-- =========================================================================
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
  select id, name, slug, logo_url, career_site_cover_url, career_site_settings
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
--> statement-breakpoint

grant execute on function public.get_career_site(text) to anon, authenticated;
--> statement-breakpoint

-- Detalle de una vacante puntual del Career Site. Devuelve null si la búsqueda no existe,
-- no pertenece a esa org, no está abierta, o el Career Site de la org está deshabilitado.
create or replace function public.get_career_site_job(p_slug text, p_job_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org record;
  v_job record;
  v_result json;
begin
  select id, name, slug, logo_url, career_site_cover_url, career_site_settings
  into v_org
  from public.organizations
  where slug = p_slug
    and career_site_enabled = true;

  if not found then
    return null;
  end if;

  select *
  into v_job
  from public.jobs
  where id = p_job_id
    and organization_id = v_org.id
    and status = 'open';

  if not found then
    return null;
  end if;

  select json_build_object(
    'organization', json_build_object(
      'organizationId', v_org.id,
      'name', v_org.name,
      'slug', v_org.slug,
      'logoUrl', v_org.logo_url,
      'coverUrl', v_org.career_site_cover_url,
      'settings', v_org.career_site_settings
    ),
    'job', json_build_object(
      'id', v_job.id,
      'title', v_job.title,
      'position', v_job.position,
      'jobArea', v_job.job_area,
      'location', v_job.location,
      'modality', v_job.modality,
      'seniority', v_job.seniority,
      'employmentType', v_job.employment_type,
      'salaryMin', v_job.salary_min,
      'salaryMax', v_job.salary_max,
      'salaryCurrency', v_job.salary_currency,
      'skills', v_job.skills,
      'objectives', v_job.objectives,
      'requirements', v_job.requirements,
      'responsibilities', v_job.responsibilities,
      'benefits', v_job.benefits,
      'createdAt', v_job.created_at
    )
  ) into v_result;

  return v_result;
end;
$$;
--> statement-breakpoint

grant execute on function public.get_career_site_job(text, uuid) to anon, authenticated;
--> statement-breakpoint

-- =========================================================================
-- 3. Postulación pública. A diferencia de la empresa (sin sesión, solo token), el candidato
--    SÍ tiene sesión real (se registró/logueó antes) — se invoca con db.rls(), no admin, para
--    que auth.uid() adentro sea su identidad real. NO se otorga a `anon`.
-- =========================================================================
create or replace function public.apply_to_career_site_job(
  p_job_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_cover_note text,
  p_cv_path text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job record;
  v_candidate_id uuid;
  v_application_id uuid;
begin
  if auth.uid() is null then
    raise exception 'forbidden: se requiere sesión para postularse';
  end if;

  select id, organization_id, status
  into v_job
  from public.jobs
  where id = p_job_id;

  if not found or v_job.status <> 'open' then
    raise exception 'invalid: la búsqueda no existe o no está abierta';
  end if;

  if not exists (
    select 1 from public.organizations
    where id = v_job.organization_id and career_site_enabled = true
  ) then
    raise exception 'invalid: el career site de esta organización no está habilitado';
  end if;

  -- Enlazar, no duplicar (docs/DATA_MODEL.md): primero por cuenta ya vinculada, si no por
  -- email dentro de la misma org (candidato fantasma cargado a mano por el recruiter).
  select id into v_candidate_id
  from public.candidates
  where organization_id = v_job.organization_id
    and (
      profile_id = auth.uid()
      or (profile_id is null and lower(email) = lower(p_email))
    )
  order by (profile_id = auth.uid()) desc
  limit 1;

  if v_candidate_id is null then
    insert into public.candidates (organization_id, profile_id, full_name, email, phone, cv_url)
    values (v_job.organization_id, auth.uid(), p_full_name, p_email, p_phone, p_cv_path)
    returning id into v_candidate_id;
  else
    update public.candidates
    set profile_id = auth.uid(),
        cv_url = p_cv_path,
        phone = coalesce(p_phone, phone)
    where id = v_candidate_id;
  end if;

  if exists (
    select 1 from public.applications
    where job_id = p_job_id and candidate_id = v_candidate_id
  ) then
    raise exception 'invalid: ya te postulaste a esta búsqueda';
  end if;

  insert into public.applications (organization_id, job_id, candidate_id, stage, cover_note)
  values (v_job.organization_id, p_job_id, v_candidate_id, 'new', p_cover_note)
  returning id into v_application_id;

  insert into public.application_events (organization_id, application_id, from_stage, to_stage, changed_by)
  values (v_job.organization_id, v_application_id, null, 'new', auth.uid());

  return json_build_object('applicationId', v_application_id, 'candidateId', v_candidate_id);
end;
$$;
--> statement-breakpoint

grant execute on function public.apply_to_career_site_job(uuid, text, text, text, text, text) to authenticated;

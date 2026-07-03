CREATE TYPE "public"."candidate_job_interaction_kind" AS ENUM('favorite', 'hidden');--> statement-breakpoint
CREATE TABLE "candidate_job_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"kind" "candidate_job_interaction_kind" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "skills" text[];--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "candidate_onboarding_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "candidate_job_interactions" ADD CONSTRAINT "candidate_job_interactions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_job_interactions" ADD CONSTRAINT "candidate_job_interactions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_job_interactions_profile_idx" ON "candidate_job_interactions" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_job_interactions_unique_idx" ON "candidate_job_interactions" USING btree ("profile_id","job_id","kind");--> statement-breakpoint

-- =========================================================================
-- Autoservicio del candidato (portal): RLS aditiva a tenant_isolation + funciones.
-- Ver docs/DATA_MODEL.md y .claude/rules/database.md. ZONA COMPARTIDA (src/db).
-- =========================================================================

-- 1. candidate_job_interactions: solo el dueño ve/crea/borra sus favoritos/ocultos.
alter table public.candidate_job_interactions enable row level security;
--> statement-breakpoint

create policy "own_interactions" on public.candidate_job_interactions
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
--> statement-breakpoint

-- 2. candidates: el candidato lee/edita su propia fila por organization (enlazada por
--    profile_id, ver apply_to_career_site_job). No se abre insert/delete directo: eso sigue
--    yendo por las funciones SECURITY DEFINER controladas. Mismo molde que
--    own_profile_select/own_profile_update en 0001.
create policy "own_candidate_read" on public.candidates
  for select to authenticated
  using (profile_id = auth.uid());
--> statement-breakpoint

create policy "own_candidate_update" on public.candidates
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
--> statement-breakpoint

-- 3. applications: el candidato lee sus propias postulaciones (cualquier organization).
--    Helper SECURITY DEFINER para evitar recursión de RLS, mismo patrón que is_org_member.
create or replace function public.is_own_candidate(p_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.candidates
    where id = p_candidate_id
      and profile_id = auth.uid()
  );
$$;
--> statement-breakpoint

grant execute on function public.is_own_candidate(uuid) to authenticated;
--> statement-breakpoint

create policy "own_applications_read" on public.applications
  for select to authenticated
  using (public.is_own_candidate(candidate_id));
--> statement-breakpoint

-- 4. Retirar postulación: fire-and-forget, borra la fila (sin estado "withdrawn" en el enum).
--    Verifica pertenencia antes de borrar; SECURITY DEFINER porque el candidato no tiene
--    delete directo por RLS (solo select/update de su propia fila de candidates, no de
--    applications).
create or replace function public.withdraw_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'forbidden: se requiere sesión para retirar una postulación';
  end if;

  delete from public.applications
  where id = p_application_id
    and public.is_own_candidate(candidate_id);

  if not found then
    raise exception 'invalid: la postulación no existe o no te pertenece';
  end if;
end;
$$;
--> statement-breakpoint

grant execute on function public.withdraw_application(uuid) to authenticated;
--> statement-breakpoint

-- 5. Portal: listado de ofertas abiertas de TODAS las organizations con career_site_enabled,
--    mismo criterio de visibilidad que el Career Site individual (get_career_site). Requiere
--    sesión (candidato autenticado), no se otorga a anon.
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
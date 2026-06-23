CREATE TYPE "public"."feedback_decision" AS ENUM('approved', 'rejected', 'maybe');--> statement-breakpoint
CREATE TABLE "shortlist_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shortlist_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shortlist_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shortlist_candidate_id" uuid NOT NULL,
	"share_id" uuid,
	"decision" "feedback_decision" NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shortlist_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shortlist_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shortlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shortlist_candidates" ADD CONSTRAINT "shortlist_candidates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlist_candidates" ADD CONSTRAINT "shortlist_candidates_shortlist_id_shortlists_id_fk" FOREIGN KEY ("shortlist_id") REFERENCES "public"."shortlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlist_candidates" ADD CONSTRAINT "shortlist_candidates_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlist_feedback" ADD CONSTRAINT "shortlist_feedback_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlist_feedback" ADD CONSTRAINT "shortlist_feedback_shortlist_candidate_id_shortlist_candidates_id_fk" FOREIGN KEY ("shortlist_candidate_id") REFERENCES "public"."shortlist_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlist_feedback" ADD CONSTRAINT "shortlist_feedback_share_id_shortlist_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."shortlist_shares"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlist_shares" ADD CONSTRAINT "shortlist_shares_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlist_shares" ADD CONSTRAINT "shortlist_shares_shortlist_id_shortlists_id_fk" FOREIGN KEY ("shortlist_id") REFERENCES "public"."shortlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlist_shares" ADD CONSTRAINT "shortlist_shares_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shortlist_candidates_org_idx" ON "shortlist_candidates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "shortlist_candidates_shortlist_idx" ON "shortlist_candidates" USING btree ("shortlist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shortlist_candidates_unique" ON "shortlist_candidates" USING btree ("shortlist_id","application_id");--> statement-breakpoint
CREATE INDEX "shortlist_feedback_org_idx" ON "shortlist_feedback" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shortlist_feedback_candidate_idx" ON "shortlist_feedback" USING btree ("shortlist_candidate_id");--> statement-breakpoint
CREATE INDEX "shortlist_shares_org_idx" ON "shortlist_shares" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shortlist_shares_token_idx" ON "shortlist_shares" USING btree ("token");--> statement-breakpoint
CREATE INDEX "shortlists_org_idx" ON "shortlists" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "shortlists_job_idx" ON "shortlists" USING btree ("job_id");--> statement-breakpoint

-- =========================================================================
-- Shortlists: aislamiento por tenant + acceso público por token (empresa).
-- ZONA COMPARTIDA (src/db): coordinado antes de mergear. Ver docs/DATA_MODEL.md.
-- El reclutador (authenticated) opera sus shortlists vía RLS. La empresa NO tiene
-- cuenta: accede SOLO a través de las funciones SECURITY DEFINER de abajo, que validan
-- el token y exponen únicamente nombre/email/CV/etapa (nunca notas/score/red flags).
-- =========================================================================

-- Privilegios base para el rol authenticated (RLS de abajo acota las filas).
grant select, insert, update, delete on
  public.shortlists, public.shortlist_candidates,
  public.shortlist_shares, public.shortlist_feedback
  to authenticated;
--> statement-breakpoint

-- RLS por tenant: el reclutador solo ve/toca shortlists de organizations donde es member.
alter table public.shortlists enable row level security;
--> statement-breakpoint
create policy "tenant_isolation" on public.shortlists
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
--> statement-breakpoint

alter table public.shortlist_candidates enable row level security;
--> statement-breakpoint
create policy "tenant_isolation" on public.shortlist_candidates
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
--> statement-breakpoint

alter table public.shortlist_shares enable row level security;
--> statement-breakpoint
create policy "tenant_isolation" on public.shortlist_shares
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
--> statement-breakpoint

-- shortlist_feedback: el reclutador LEE el feedback de su org (la empresa lo inserta
-- vía función definer, que bypassa RLS de forma controlada).
alter table public.shortlist_feedback enable row level security;
--> statement-breakpoint
create policy "tenant_isolation" on public.shortlist_feedback
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
--> statement-breakpoint

-- =========================================================================
-- Acceso de la EMPRESA por token (sin cuenta). Funciones SECURITY DEFINER:
-- toda la autorización vive acá dentro (token vigente + pertenencia al shortlist).
-- Exponen SOLO los campos permitidos por el KEYSTONE. No filtran notas/score/red flags.
-- =========================================================================

-- Devuelve el shortlist compartido (metadata + candidatos permitidos) o NULL si el
-- token no existe, está revocado o venció.
create or replace function public.get_shared_shortlist(p_token text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_share record;
  v_result json;
begin
  select s.id as share_id, s.shortlist_id, sl.name as shortlist_name, j.title as job_title
  into v_share
  from public.shortlist_shares s
  join public.shortlists sl on sl.id = s.shortlist_id
  join public.jobs j on j.id = sl.job_id
  where s.token = p_token
    and s.revoked_at is null
    and (s.expires_at is null or s.expires_at > now());

  if not found then
    return null;
  end if;

  select json_build_object(
    'shareId', v_share.share_id,
    'shortlistName', v_share.shortlist_name,
    'jobTitle', v_share.job_title,
    'candidates', coalesce((
      select json_agg(
        json_build_object(
          'shortlistCandidateId', sc.id,
          'fullName', c.full_name,
          'email', c.email,
          'cvUrl', c.cv_url,
          'stage', a.stage,
          'feedbackDecision', f.decision,
          'feedbackComment', f.comment
        ) order by c.full_name
      )
      from public.shortlist_candidates sc
      join public.applications a on a.id = sc.application_id
      join public.candidates c on c.id = a.candidate_id
      left join public.shortlist_feedback f on f.shortlist_candidate_id = sc.id
      where sc.shortlist_id = v_share.shortlist_id
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;
--> statement-breakpoint

grant execute on function public.get_shared_shortlist(text) to anon, authenticated;
--> statement-breakpoint

-- Registra (upsert) el feedback de la empresa sobre un candidato del shortlist.
-- Valida el token y que el candidato pertenezca al shortlist de ese token.
create or replace function public.submit_shortlist_feedback(
  p_token text,
  p_shortlist_candidate_id uuid,
  p_decision text,
  p_comment text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share record;
  v_sc record;
begin
  select id, shortlist_id into v_share
  from public.shortlist_shares
  where token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  if not found then
    raise exception 'forbidden: token inválido o vencido';
  end if;

  if p_decision not in ('approved', 'rejected', 'maybe') then
    raise exception 'invalid: decisión inválida';
  end if;

  select id, organization_id into v_sc
  from public.shortlist_candidates
  where id = p_shortlist_candidate_id
    and shortlist_id = v_share.shortlist_id;

  if not found then
    raise exception 'forbidden: el candidato no pertenece a este shortlist';
  end if;

  insert into public.shortlist_feedback
    (organization_id, shortlist_candidate_id, share_id, decision, comment)
  values
    (v_sc.organization_id, p_shortlist_candidate_id, v_share.id,
     p_decision::feedback_decision, nullif(btrim(p_comment), ''))
  on conflict (shortlist_candidate_id)
  do update set
    decision = excluded.decision,
    comment = excluded.comment,
    share_id = excluded.share_id,
    updated_at = now();

  return true;
end;
$$;
--> statement-breakpoint

grant execute on function public.submit_shortlist_feedback(text, uuid, text, text) to anon, authenticated;
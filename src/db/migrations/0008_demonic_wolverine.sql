CREATE TYPE "public"."candidate_source" AS ENUM('manual', 'linkedin', 'referral', 'job_board', 'other');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'internship', 'temporary');--> statement-breakpoint
CREATE TYPE "public"."job_modality" AS ENUM('onsite', 'remote', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."job_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."job_seniority" AS ENUM('junior', 'semisenior', 'senior', 'lead');--> statement-breakpoint
CREATE TABLE "application_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"from_stage" "application_stage",
	"to_stage" "application_stage" NOT NULL,
	"changed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "skills" text[];--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "source" "candidate_source";--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "consent_accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "posting" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "modality" "job_modality";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "seniority" "job_seniority";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "employment_type" "employment_type";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_min" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_max" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_currency" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "skills" text[];--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "priority" "job_priority";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "deadline" date;--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_changed_by_profiles_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_events_org_idx" ON "application_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "application_events_application_idx" ON "application_events" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "clients_org_idx" ON "clients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "notes_org_idx" ON "notes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "notes_application_idx" ON "notes" USING btree ("application_id");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_client_idx" ON "jobs" USING btree ("client_id");--> statement-breakpoint

-- =========================================================================
-- RLS por tenant para las tablas nuevas (clients, notes, application_events).
-- Mismo patrón que jobs/candidates/applications: solo se accede a filas de
-- organizations donde el usuario es member. Helper public.is_org_member (0001).
-- Las columnas nuevas de jobs/candidates heredan la política existente de su tabla.
-- ZONA COMPARTIDA (src/db): coordinado antes de mergear. Ver docs/DATA_MODEL.md.
-- =========================================================================

grant select, insert, update, delete on
  public.clients, public.notes, public.application_events
  to authenticated;
--> statement-breakpoint

alter table public.clients enable row level security;
--> statement-breakpoint
create policy "tenant_isolation" on public.clients
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
--> statement-breakpoint

alter table public.notes enable row level security;
--> statement-breakpoint
create policy "tenant_isolation" on public.notes
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
--> statement-breakpoint

alter table public.application_events enable row level security;
--> statement-breakpoint
create policy "tenant_isolation" on public.application_events
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
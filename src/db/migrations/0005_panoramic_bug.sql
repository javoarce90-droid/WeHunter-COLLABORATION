CREATE TYPE "public"."interview_mode" AS ENUM('onsite', 'remote', 'phone');--> statement-breakpoint
CREATE TYPE "public"."interview_status" AS ENUM('scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"mode" "interview_mode" DEFAULT 'remote' NOT NULL,
	"location" text,
	"notes" text,
	"status" "interview_status" DEFAULT 'scheduled' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interviews_org_idx" ON "interviews" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "interviews_application_idx" ON "interviews" USING btree ("application_id");--> statement-breakpoint

-- =========================================================================
-- Interviews: aislamiento por tenant. Tabla INTERNA del equipo reclutador
-- (NO se expone a la empresa por el share). El reclutador (authenticated)
-- opera sus entrevistas vía RLS; solo accede a las de organizations donde es member.
-- ZONA COMPARTIDA (src/db): coordinado antes de mergear. Ver docs/DATA_MODEL.md.
-- =========================================================================

-- Privilegios base para el rol authenticated (la RLS de abajo acota las filas).
grant select, insert, update, delete on public.interviews to authenticated;
--> statement-breakpoint

alter table public.interviews enable row level security;
--> statement-breakpoint
create policy "tenant_isolation" on public.interviews
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
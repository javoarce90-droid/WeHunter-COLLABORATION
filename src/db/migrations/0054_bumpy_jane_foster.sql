CREATE TYPE "public"."requisition_reason" AS ENUM('new_position', 'backfill');--> statement-breakpoint
CREATE TYPE "public"."requisition_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "client_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requisitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid,
	"created_by_profile_id" uuid,
	"status" "requisition_status" DEFAULT 'pending' NOT NULL,
	"reason" "requisition_reason" NOT NULL,
	"budget" text,
	"estimated_start_date" date,
	"title" text NOT NULL,
	"position" text,
	"job_area" "job_area",
	"location" text,
	"modality" "job_modality",
	"seniority" "job_seniority",
	"employment_type" "employment_type",
	"skills" text[],
	"objectives" text,
	"requirements" text,
	"responsibilities" text,
	"benefits" jsonb,
	"review_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"job_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "requisitions_source_check" CHECK (("requisitions"."client_id" is not null) <> ("requisitions"."created_by_profile_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "client_shares" ADD CONSTRAINT "client_shares_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_shares" ADD CONSTRAINT "client_shares_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_shares" ADD CONSTRAINT "client_shares_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_created_by_profile_id_profiles_id_fk" FOREIGN KEY ("created_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_shares_org_idx" ON "client_shares" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "client_shares_client_idx" ON "client_shares" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_shares_token_idx" ON "client_shares" USING btree ("token");--> statement-breakpoint
CREATE INDEX "requisitions_org_idx" ON "requisitions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "requisitions_client_idx" ON "requisitions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "requisitions_status_idx" ON "requisitions" USING btree ("organization_id","status");
--> statement-breakpoint

-- RLS: mismo patrón "tenant_isolation" que el resto (solo miembros de la org). El acceso del
-- Cliente sin sesión (crear requisition, ver estado, leer su client_share) no pasa por acá —
-- va a través de funciones SECURITY DEFINER (siguiente pieza, mismo patrón que
-- get_shared_shortlist/submit_shortlist_feedback), que bypassean RLS igual que esas.
ALTER TABLE "client_shares" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "client_shares"
  USING (public.is_org_member(organization_id));
--> statement-breakpoint
GRANT ALL ON "client_shares" TO authenticated;
--> statement-breakpoint

ALTER TABLE "requisitions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "requisitions"
  USING (public.is_org_member(organization_id));
--> statement-breakpoint
GRANT ALL ON "requisitions" TO authenticated;
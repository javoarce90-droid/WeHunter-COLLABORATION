CREATE TYPE "public"."offer_status" AS ENUM('draft', 'sent', 'negotiation', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"title" text NOT NULL,
	"salary_amount" integer,
	"salary_currency" text,
	"benefits" text,
	"start_date" date,
	"valid_until" date,
	"body" text,
	"status" "offer_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "offers_org_idx" ON "offers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "offers_job_idx" ON "offers" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "offers_application_idx" ON "offers" USING btree ("application_id");
--> statement-breakpoint
GRANT ALL ON "offers" TO authenticated;
--> statement-breakpoint
ALTER TABLE "offers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "offers"
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));
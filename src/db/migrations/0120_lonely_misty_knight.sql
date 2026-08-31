CREATE TABLE "pool_match_ignored" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"ignored_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pool_match_ignored" ADD CONSTRAINT "pool_match_ignored_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_match_ignored" ADD CONSTRAINT "pool_match_ignored_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_match_ignored" ADD CONSTRAINT "pool_match_ignored_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_match_ignored" ADD CONSTRAINT "pool_match_ignored_ignored_by_profiles_id_fk" FOREIGN KEY ("ignored_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pool_match_ignored_org_idx" ON "pool_match_ignored" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pool_match_ignored_job_candidate_unique" ON "pool_match_ignored" USING btree ("job_id","candidate_id");--> statement-breakpoint

-- RLS: mismo patrón "tenant_isolation" que el resto (solo miembros de la org).
ALTER TABLE "pool_match_ignored" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "pool_match_ignored"
  USING (public.is_org_member(organization_id));
--> statement-breakpoint
GRANT ALL ON "pool_match_ignored" TO authenticated;
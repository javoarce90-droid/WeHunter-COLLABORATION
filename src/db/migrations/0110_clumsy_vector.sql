CREATE TABLE "pool_match_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"summary" text NOT NULL,
	"breakdown" jsonb NOT NULL,
	"strengths" text[] NOT NULL,
	"red_flags" text[] NOT NULL,
	"job_updated_at" timestamp NOT NULL,
	"candidate_updated_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pool_match_results" ADD CONSTRAINT "pool_match_results_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_match_results" ADD CONSTRAINT "pool_match_results_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_match_results" ADD CONSTRAINT "pool_match_results_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pool_match_results_org_idx" ON "pool_match_results" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pool_match_results_job_candidate_unique" ON "pool_match_results" USING btree ("job_id","candidate_id");--> statement-breakpoint

-- RLS: mismo patrón "tenant_isolation" que el resto (solo miembros de la org).
ALTER TABLE "pool_match_results" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "pool_match_results"
  USING (public.is_org_member(organization_id));
--> statement-breakpoint
GRANT ALL ON "pool_match_results" TO authenticated;
CREATE TABLE "sourcing_search_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"results" jsonb NOT NULL,
	"metrics" jsonb NOT NULL,
	"is_live_api" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sourcing_search_sessions" ADD CONSTRAINT "sourcing_search_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sourcing_search_sessions" ADD CONSTRAINT "sourcing_search_sessions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sourcing_search_sessions" ADD CONSTRAINT "sourcing_search_sessions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sourcing_search_sessions_org_idx" ON "sourcing_search_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sourcing_search_sessions_job_profile_unique" ON "sourcing_search_sessions" USING btree ("job_id","profile_id");--> statement-breakpoint

-- RLS: mismo patrón "tenant_isolation" que el resto (solo miembros de la org).
ALTER TABLE "sourcing_search_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sourcing_search_sessions"
  USING (public.is_org_member(organization_id));
--> statement-breakpoint
GRANT ALL ON "sourcing_search_sessions" TO authenticated;
CREATE TABLE "sourcing_provider_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"linkedin_url" text NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sourcing_provider_profiles" ADD CONSTRAINT "sourcing_provider_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sourcing_provider_profiles_org_idx" ON "sourcing_provider_profiles" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sourcing_provider_profiles_org_url_idx" ON "sourcing_provider_profiles" USING btree ("organization_id","linkedin_url");--> statement-breakpoint

-- RLS: mismo patrón "tenant_isolation" que el resto (solo miembros de la org).
ALTER TABLE "sourcing_provider_profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sourcing_provider_profiles"
  USING (public.is_org_member(organization_id));
--> statement-breakpoint
GRANT ALL ON "sourcing_provider_profiles" TO authenticated;
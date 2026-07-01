ALTER TYPE "public"."application_stage" ADD VALUE 'interview_hr' BEFORE 'offer';--> statement-breakpoint
ALTER TYPE "public"."application_stage" ADD VALUE 'interview_tech' BEFORE 'offer';--> statement-breakpoint
ALTER TYPE "public"."application_stage" ADD VALUE 'interview_client' BEFORE 'offer';--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"stage_key" "application_stage" NOT NULL,
	"label_override" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sla_days" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pipeline_stages_org_idx" ON "pipeline_stages" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_stages_org_stage_idx" ON "pipeline_stages" USING btree ("organization_id","stage_key");
--> statement-breakpoint
ALTER TABLE "pipeline_stages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "pipeline_stages"
  USING (public.is_org_member(organization_id));
--> statement-breakpoint
GRANT ALL ON "pipeline_stages" TO authenticated;
CREATE TYPE "public"."stage_kind" AS ENUM('inbox', 'in_process', 'offer', 'hired', 'rejected');--> statement-breakpoint
CREATE TABLE "job_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"sla_days" integer,
	"kind" "stage_kind" NOT NULL,
	"legacy_stage" "application_stage",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "stage_id" uuid;--> statement-breakpoint
ALTER TABLE "job_stages" ADD CONSTRAINT "job_stages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_stages" ADD CONSTRAINT "job_stages_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_stages_job_idx" ON "job_stages" USING btree ("job_id","position");--> statement-breakpoint
CREATE INDEX "job_stages_org_idx" ON "job_stages" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_stage_id_job_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."job_stages"("id") ON DELETE restrict ON UPDATE no action;
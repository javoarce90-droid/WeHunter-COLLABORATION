CREATE TYPE "public"."screening_question_type" AS ENUM('yes_no', 'text', 'number', 'multiple_choice');--> statement-breakpoint
CREATE TABLE "screening_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screening_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"type" "screening_question_type" NOT NULL,
	"label" text NOT NULL,
	"options" text[],
	"required" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "screening_answers" ADD CONSTRAINT "screening_answers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_answers" ADD CONSTRAINT "screening_answers_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_answers" ADD CONSTRAINT "screening_answers_question_id_screening_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."screening_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_questions" ADD CONSTRAINT "screening_questions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_questions" ADD CONSTRAINT "screening_questions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "screening_answers_application_idx" ON "screening_answers" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "screening_answers_application_question_idx" ON "screening_answers" USING btree ("application_id","question_id");--> statement-breakpoint
CREATE INDEX "screening_questions_job_idx" ON "screening_questions" USING btree ("job_id","position");
--> statement-breakpoint

-- RLS: mismo patrón que pipeline_stages (0009) — solo miembros de la org, sin distinción de
-- rol acá (la autorización primaria por rol vive en el dominio, ver database.md).
ALTER TABLE "screening_questions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "screening_questions"
  USING (public.is_org_member(organization_id));
--> statement-breakpoint
GRANT ALL ON "screening_questions" TO authenticated;
--> statement-breakpoint

-- screening_answers: mismo patrón. El insert real durante la postulación pública lo hace
-- apply_to_career_site_job (SECURITY DEFINER, bypassea RLS) — esta política es para que el
-- recruiter (miembro de la org) pueda leerlas después.
ALTER TABLE "screening_answers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "screening_answers"
  USING (public.is_org_member(organization_id));
--> statement-breakpoint
GRANT ALL ON "screening_answers" TO authenticated;
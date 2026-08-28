CREATE TYPE "public"."interview_recommendation" AS ENUM('avanzar', 'continuar_evaluando', 'no_avanzar');--> statement-breakpoint
CREATE TABLE "interview_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"interview_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"recommendation" "interview_recommendation" NOT NULL,
	"recommendation_justification" text NOT NULL,
	"source_notes" text NOT NULL,
	"generated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "interview_reports_interview_id_unique" UNIQUE("interview_id")
);
--> statement-breakpoint
ALTER TABLE "interview_reports" ADD CONSTRAINT "interview_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_reports" ADD CONSTRAINT "interview_reports_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_reports" ADD CONSTRAINT "interview_reports_generated_by_profiles_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interview_reports_org_idx" ON "interview_reports" USING btree ("organization_id");--> statement-breakpoint

-- RLS: aislamiento por tenant, mismo patrón que el resto de las tablas de dominio (ver 0114).
-- `with check` incluido para que un miembro de la org A no pueda insertar filas con el
-- organization_id de la org B.
ALTER TABLE "interview_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "interview_reports"
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));
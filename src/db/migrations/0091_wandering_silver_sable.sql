CREATE TABLE "candidate_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidate_tags" ADD CONSTRAINT "candidate_tags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_tags" ADD CONSTRAINT "candidate_tags_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_tags" ADD CONSTRAINT "candidate_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_tags_org_idx" ON "candidate_tags" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "candidate_tags_candidate_idx" ON "candidate_tags" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "candidate_tags_tag_idx" ON "candidate_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_tags_unique" ON "candidate_tags" USING btree ("candidate_id","tag_id");--> statement-breakpoint
CREATE INDEX "tags_org_idx" ON "tags" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_org_name_idx" ON "tags" USING btree ("organization_id","name");
--> statement-breakpoint

-- RLS: mismo patrón "tenant_isolation" que el resto (solo miembros de la org).
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "tags"
  USING (public.is_org_member(organization_id));
--> statement-breakpoint
GRANT ALL ON "tags" TO authenticated;
--> statement-breakpoint

ALTER TABLE "candidate_tags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "candidate_tags"
  USING (public.is_org_member(organization_id));
--> statement-breakpoint
GRANT ALL ON "candidate_tags" TO authenticated;
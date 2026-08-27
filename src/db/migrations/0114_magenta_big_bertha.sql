CREATE TABLE "client_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"external_id" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_emails" ADD CONSTRAINT "client_emails_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_emails" ADD CONSTRAINT "client_emails_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_emails" ADD CONSTRAINT "client_emails_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_emails_org_idx" ON "client_emails" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "client_emails_client_activity_idx" ON "client_emails" USING btree ("client_id","created_at");--> statement-breakpoint

-- RLS: aislamiento por tenant, mismo patrón que el resto de las tablas de dominio
-- (ver 0008/0055). `with check` incluido para que un miembro de la org A no pueda insertar
-- filas con el organization_id de la org B.
ALTER TABLE "client_emails" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "client_emails"
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));
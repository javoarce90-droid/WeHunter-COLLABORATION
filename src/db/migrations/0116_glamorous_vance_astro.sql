CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"workspace_type" "workspace_type" NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"trial_days" integer DEFAULT 14 NOT NULL,
	"max_members" integer NOT NULL,
	"dlocal_plan_token" text,
	"dlocal_subscribe_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "plans_code_idx" ON "plans" USING btree ("code");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "dlocal_plan_token";--> statement-breakpoint

-- Catálogo de planes. Lectura para cualquier autenticado (se muestra en el onboarding y en
-- Plan y Facturación); la escritura queda solo para migraciones / cliente admin (backoffice
-- futuro), sin política de INSERT/UPDATE/DELETE.
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "read_all" ON "plans" FOR SELECT TO authenticated USING (true);--> statement-breakpoint

-- Semilla de los dos planes self-serve vigentes. dLocal token/URL se completan con el
-- script `scripts/dlocal-create-plan.mjs`. Enterprise no lleva fila: es contacto comercial.
INSERT INTO "plans" ("code", "name", "workspace_type", "price", "currency", "trial_days", "max_members", "sort_order")
VALUES
  ('freelancer', 'Freelancer', 'freelance', 29.99, 'USD', 14, 1, 1),
  ('teams',      'Teams',      'team',      99.99, 'USD', 14, 5, 2);--> statement-breakpoint

-- Backfill: las suscripciones que ya existían quedan apuntando al plan Freelancer.
UPDATE "subscriptions"
SET "plan_id" = (SELECT "id" FROM "plans" WHERE "code" = 'freelancer')
WHERE "plan_id" IS NULL;
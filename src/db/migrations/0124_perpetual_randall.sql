CREATE TYPE "public"."sourcing_credit_event_type" AS ENUM('NEW_PROFILE', 'REUSED_PROFILE', 'DUPLICATE', 'PROFILE_REFRESH', 'FAILED');--> statement-breakpoint
CREATE TABLE "sourcing_credit_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"included_balance" integer DEFAULT 0 NOT NULL,
	"purchased_balance" integer DEFAULT 0 NOT NULL,
	"active_credit_budget" integer DEFAULT 0 NOT NULL,
	"cycle_ends_at" timestamp,
	"low_balance_notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sourcing_credit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_id" uuid,
	"user_id" uuid,
	"candidate_key" text NOT NULL,
	"event_type" "sourcing_credit_event_type" NOT NULL,
	"credits_charged" integer DEFAULT 0 NOT NULL,
	"credit_source" text,
	"provider_cost_usd" numeric(10, 4),
	"provider" text,
	"occurred_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "credit_budget" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sourcing_credit_balances" ADD CONSTRAINT "sourcing_credit_balances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sourcing_credit_events" ADD CONSTRAINT "sourcing_credit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sourcing_credit_events" ADD CONSTRAINT "sourcing_credit_events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sourcing_credit_events" ADD CONSTRAINT "sourcing_credit_events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sourcing_credit_balances_org_idx" ON "sourcing_credit_balances" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sourcing_credit_events_org_idx" ON "sourcing_credit_events" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "sourcing_credit_events_job_idx" ON "sourcing_credit_events" USING btree ("job_id");--> statement-breakpoint

-- RLS: mismo patrón "tenant_isolation" que el resto (solo miembros de la org).
ALTER TABLE "sourcing_credit_balances" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sourcing_credit_balances"
  USING (public.is_org_member(organization_id));
--> statement-breakpoint
GRANT ALL ON "sourcing_credit_balances" TO authenticated;
--> statement-breakpoint

ALTER TABLE "sourcing_credit_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sourcing_credit_events"
  USING (public.is_org_member(organization_id));
--> statement-breakpoint
GRANT ALL ON "sourcing_credit_events" TO authenticated;
--> statement-breakpoint

-- Créditos incluidos por plan (limitar-sourcing-ia, proposal.md §4.6). Configuración de datos,
-- no código — ajustable después sin migración nueva (ej. desde un futuro backoffice).
UPDATE "plans" SET "credit_budget" = 250 WHERE "code" = 'freelancer';
--> statement-breakpoint
UPDATE "plans" SET "credit_budget" = 1350 WHERE "code" = 'teams';
--> statement-breakpoint

-- Backfill: toda organización que ya existía antes de esta migración necesita su fila de saldo
-- desde el día 1 — si no, `getAvailableSourcingBalance` lee 0 y bloquea Sourcing hasta la
-- próxima renovación real (el hook de `applyReconcile(AsSystem)` recién corre en el próximo
-- cobro, design.md §4/§13). Org con suscripción paga vigente → `credit_budget` de su plan; el
-- resto (trial, o legado sin plan) → los mismos créditos de Free Trial que se siembran para una
-- organización nueva (`FREE_TRIAL_SOURCING_CREDITS` = 10, ver
-- `sourcing-credits/domain/free-trial-credits.ts`).
INSERT INTO "sourcing_credit_balances"
  ("organization_id", "included_balance", "purchased_balance", "active_credit_budget")
SELECT
  o."id",
  COALESCE(p."credit_budget", 10),
  0,
  COALESCE(p."credit_budget", 10)
FROM "organizations" o
LEFT JOIN "subscriptions" s
  ON s."organization_id" = o."id" AND s."status" IN ('active', 'past_due', 'cancelled')
LEFT JOIN "plans" p ON p."id" = s."plan_id"
ON CONFLICT ("organization_id") DO NOTHING;
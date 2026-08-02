ALTER TABLE "applications" ADD COLUMN "stage_entered_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "share_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "assigned_client_id" uuid;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_assigned_client_id_clients_id_fk" FOREIGN KEY ("assigned_client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
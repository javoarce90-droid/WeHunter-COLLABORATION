ALTER TABLE "jobs" ADD COLUMN "sourcer_id" uuid;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_sourcer_id_memberships_id_fk" FOREIGN KEY ("sourcer_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_sourcer_idx" ON "jobs" USING btree ("sourcer_id");
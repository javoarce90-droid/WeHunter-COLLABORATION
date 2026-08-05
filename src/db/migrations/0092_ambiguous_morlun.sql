ALTER TABLE "requisitions" ADD COLUMN "assigned_to_membership_id" uuid;--> statement-breakpoint
ALTER TABLE "shortlist_shares" ADD COLUMN "shared_with_membership_id" uuid;--> statement-breakpoint
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_assigned_to_membership_id_memberships_id_fk" FOREIGN KEY ("assigned_to_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlist_shares" ADD CONSTRAINT "shortlist_shares_shared_with_membership_id_memberships_id_fk" FOREIGN KEY ("shared_with_membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "requisitions_assigned_to_idx" ON "requisitions" USING btree ("assigned_to_membership_id");--> statement-breakpoint
CREATE INDEX "shortlist_shares_shared_with_idx" ON "shortlist_shares" USING btree ("shared_with_membership_id");
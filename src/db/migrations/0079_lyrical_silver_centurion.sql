ALTER TABLE "candidates" ADD COLUMN "saved_to_pool" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "talent_pool_saved_at";
ALTER TABLE "applications" ADD COLUMN "cover_note" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "career_site_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "career_site_cover_url" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "career_site_settings" jsonb;
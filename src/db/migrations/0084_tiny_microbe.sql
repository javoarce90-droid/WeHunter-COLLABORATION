ALTER TABLE "applications" ADD COLUMN "ai_red_flags" text[];--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "ai_breakdown" jsonb;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "ai_strengths" text[];
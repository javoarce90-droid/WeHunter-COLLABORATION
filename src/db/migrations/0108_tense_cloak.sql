ALTER TABLE "interviews" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "type" SET DEFAULT 'screening';--> statement-breakpoint
DROP TYPE "public"."interview_type";

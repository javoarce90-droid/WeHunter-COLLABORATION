ALTER TABLE "interviews" ALTER COLUMN "scheduled_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shortlist_candidates" ALTER COLUMN "interview_requested_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shortlist_candidates" ALTER COLUMN "interview_requested_slots" SET DATA TYPE timestamp with time zone[];
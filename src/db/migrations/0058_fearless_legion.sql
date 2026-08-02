ALTER TABLE "applications" ADD COLUMN "pipeline_entered_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "screening_questions" ADD COLUMN "is_criterion" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "screening_questions" ADD COLUMN "expected_values" text[];--> statement-breakpoint
ALTER TABLE "screening_questions" ADD COLUMN "min_value" integer;--> statement-breakpoint
ALTER TABLE "screening_questions" ADD COLUMN "max_value" integer;
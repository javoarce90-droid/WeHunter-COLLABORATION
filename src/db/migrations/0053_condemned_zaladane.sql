ALTER TABLE "messages" ADD COLUMN "external_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "messages_thread_external_idx" ON "messages" USING btree ("thread_id","external_id");
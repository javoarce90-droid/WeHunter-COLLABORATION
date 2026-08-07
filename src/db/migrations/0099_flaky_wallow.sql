CREATE INDEX "jobs_org_status_idx" ON "jobs" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "jobs_org_created_idx" ON "jobs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "jobs_org_updated_idx" ON "jobs" USING btree ("organization_id","updated_at");
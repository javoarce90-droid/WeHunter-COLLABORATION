CREATE TYPE "public"."workspace_type" AS ENUM('freelance', 'team', 'enterprise');--> statement-breakpoint
ALTER TYPE "public"."org_role" ADD VALUE 'sourcer';--> statement-breakpoint
ALTER TYPE "public"."org_role" ADD VALUE 'viewer';--> statement-breakpoint
ALTER TYPE "public"."org_role" ADD VALUE 'hiring_manager';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "workspace_type" "workspace_type";
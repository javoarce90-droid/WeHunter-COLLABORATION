CREATE TYPE "public"."job_area" AS ENUM('tecnologia', 'salud', 'finanzas', 'ventas', 'marketing', 'rrhh', 'operaciones', 'legal', 'educacion', 'ingenieria', 'diseno', 'atencion_cliente', 'otro');--> statement-breakpoint
ALTER TYPE "public"."employment_type" ADD VALUE 'freelance';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "position" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "job_area" "job_area";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "vacancies" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "objectives" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "requirements" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "responsibilities" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "benefits" jsonb;
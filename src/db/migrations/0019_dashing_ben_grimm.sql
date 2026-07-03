CREATE TYPE "public"."rejection_reason" AS ENUM('perfil_no_ajusta', 'pretension_salarial', 'proceso_avanzado_otro_candidato', 'no_disponibilidad', 'otro');--> statement-breakpoint
ALTER TABLE "application_events" ADD COLUMN "rejection_reason" "rejection_reason";--> statement-breakpoint
ALTER TABLE "application_events" ADD COLUMN "rejection_note" text;
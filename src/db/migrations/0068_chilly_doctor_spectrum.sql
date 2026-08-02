-- Idempotente a propósito: esta columna/FK/índice ya existen en la base real (se habían
-- creado a mano, sin migración, mientras se exploraba la idea de "responsable de búsqueda" —
-- ver memoria del proyecto). Esta migración reconcilia el schema versionado con lo que ya
-- está aplicado, sin fallar por "ya existe" en el ambiente donde eso pasó, y sigue sirviendo
-- para levantar un ambiente nuevo desde cero.
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "assigned_to" uuid;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_assigned_to_memberships_id_fk'
  ) THEN
    ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assigned_to_memberships_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_assigned_to_idx" ON "jobs" USING btree ("assigned_to");
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "assigned_to" SET NOT NULL;

ALTER TABLE "organizations" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "preferences" jsonb;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "bio" text;--> statement-breakpoint
-- RLS: editar los datos del workspace (nombre, logo, preferencias) lo puede hacer SOLO
-- el owner o un admin activo de esa org. Custom SQL (como 0001/0016): no se refleja en el
-- schema TS. La subquery a memberships filtra por profile_id = auth.uid(), así que pasa por
-- la política "own_memberships" (no recursiva).
CREATE POLICY "org_admin_can_update" ON "organizations"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = organizations.id
        AND m.profile_id = auth.uid()
        AND m.role IN ('owner', 'admin')
        AND m.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = organizations.id
        AND m.profile_id = auth.uid()
        AND m.role IN ('owner', 'admin')
        AND m.status = 'active'
    )
  );
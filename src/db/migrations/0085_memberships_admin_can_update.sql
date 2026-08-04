-- RLS: memberships tenía SELECT ("own_memberships" en 0001, "team_can_read" en 0016) pero
-- NUNCA una política UPDATE ni DELETE. Con RLS activado y sin política permisiva para esos
-- comandos, un UPDATE/DELETE afecta 0 filas en silencio (no es un error de Postgres) — por eso
-- actualizarMiembroAction/eliminarMiembroAction devolvían { ok: true } sin escribir nada.
-- Custom SQL (como 0001/0016/0017/0072): no se refleja en el schema TS. Mismo patrón que
-- "org_admin_can_update" (0017) sobre organizations: owner/admin ACTIVO de la MISMA org que la
-- fila objetivo (organization_id matcheado explícitamente, no solo "es owner/admin de alguna
-- org" — si no, un owner de otra org podría tocar memberships ajenas adivinando el id).
CREATE POLICY "org_admin_can_update_membership" ON "memberships"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = memberships.organization_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('owner', 'admin')
        AND m.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = memberships.organization_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('owner', 'admin')
        AND m.status = 'active'
    )
  );
--> statement-breakpoint

-- Eliminar un miembro (eliminarMiembroAction) tiene el mismo problema y el mismo dueño de la
-- decisión (owner/admin de la org). El dominio ya bloquea eliminar al owner y auto-eliminarse
-- (gestionar-equipo.ts) — esto es el respaldo RLS, no la autorización primaria.
CREATE POLICY "org_admin_can_delete_membership" ON "memberships"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = memberships.organization_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('owner', 'admin')
        AND m.status = 'active'
    )
  );

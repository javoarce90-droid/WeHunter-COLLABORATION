-- RLS: eliminar el workspace lo puede hacer SOLO el owner de esa org (más destructivo que
-- editarlo, por eso no se delega a admin como "org_admin_can_update"). Custom SQL (como
-- 0001/0016/0017): no se refleja en el schema TS. Cascada FK ya borra el resto de las tablas
-- de dominio (memberships, jobs, applications, clients, etc.) al borrar la fila de organizations.
CREATE POLICY "org_owner_can_delete" ON "organizations"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = organizations.id
        AND m.profile_id = auth.uid()
        AND m.role = 'owner'
        AND m.status = 'active'
    )
  );

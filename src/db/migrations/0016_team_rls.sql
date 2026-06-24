-- RLS para la gestión de equipo (E10). Custom SQL (como 0001): no se refleja en el schema TS.
-- Permite a los miembros de una org ver a sus compañeros (memberships + profiles), sin recursión.

-- Equipo: los miembros de una org pueden LEER todas las memberships de esa org (no solo la
-- propia). is_org_member es SECURITY DEFINER → no recursa sobre la RLS de memberships.
CREATE POLICY "team_can_read" ON "memberships"
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
--> statement-breakpoint
-- Para mostrar nombre/email de los compañeros de org: función definer (evita recursión RLS).
CREATE OR REPLACE FUNCTION public.shares_org(p_profile uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m_self
    JOIN public.memberships m_other ON m_self.organization_id = m_other.organization_id
    WHERE m_self.profile_id = auth.uid() AND m_other.profile_id = p_profile
  );
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.shares_org(uuid) TO authenticated;
--> statement-breakpoint
CREATE POLICY "coworker_profile_select" ON "profiles"
  FOR SELECT TO authenticated
  USING (public.shares_org(id));

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { memberships, orgRole } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrgRole = (typeof orgRole.enumValues)[number];

/**
 * Helpers de sesión y tenancy. Son la base de la autorización: cada caso de uso del
 * dominio recibe el contexto que devuelven estas funciones (userId, organizationId, rol)
 * y decide qué se puede hacer. Ver .claude/rules/architecture.md y database.md.
 */

export interface ActiveMembership {
  organizationId: string;
  role: OrgRole;
}

/** Usuario autenticado actual (Supabase Auth) o null si no hay sesión. */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Membership "activa" del usuario actual: con qué organization y rol opera.
 * Por ahora devolvemos la primera (una persona puede pertenecer a varias orgs; el
 * selector de org activa es una mejora futura). Devuelve null si el usuario no tiene
 * ninguna membership todavía → hay que onboardear (crear organization).
 *
 * Usa el cliente RLS: Postgres solo devuelve las memberships del propio usuario.
 */
export async function getActiveMembership(): Promise<ActiveMembership | null> {
  const db = await getDb();
  if (!db.userId) return null;

  const rows = await db.rls((tx) =>
    tx
      .select({
        organizationId: memberships.organizationId,
        role: memberships.role,
      })
      .from(memberships)
      .where(eq(memberships.profileId, db.userId!))
      .orderBy(memberships.createdAt)
      .limit(1),
  );

  return rows[0] ?? null;
}

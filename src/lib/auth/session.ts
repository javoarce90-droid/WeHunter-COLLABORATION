import { cache } from "react";
import { eq } from "drizzle-orm";
import { getAuth, getDb } from "@/db/client";
import { memberships, orgRole } from "@/db/schema";

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

/**
 * Usuario autenticado actual (Supabase Auth) o null si no hay sesión.
 * Reusa getAuth() (cache() por request): el getUser() remoto se hace UNA sola vez
 * por request aunque el layout y la page pidan el usuario por separado.
 */
export async function getCurrentUser() {
  const { user } = await getAuth();
  return user;
}

/**
 * Membership "activa" del usuario actual: con qué organization y rol opera.
 * Por ahora devolvemos la primera (una persona puede pertenecer a varias orgs; el
 * selector de org activa es una mejora futura). Devuelve null si el usuario no tiene
 * ninguna membership todavía → hay que onboardear (crear organization).
 *
 * Usa el cliente RLS: Postgres solo devuelve las memberships del propio usuario.
 *
 * cache() por request: el layout y la page la piden por separado, pero la query a la
 * base corre UNA sola vez. Si ves "db.membership" dos veces en la terminal, algo rompió
 * la dedup.
 */
export const getActiveMembership = cache(
  async (): Promise<ActiveMembership | null> => {
    const db = await getDb();
    if (!db.userId) return null;

    const rows = await db.rls(
      (tx) =>
        tx
          .select({
            organizationId: memberships.organizationId,
            role: memberships.role,
          })
          .from(memberships)
          .where(eq(memberships.profileId, db.userId!))
          .orderBy(memberships.createdAt)
          .limit(1),
      "db.membership",
    );

    return rows[0] ?? null;
  },
);

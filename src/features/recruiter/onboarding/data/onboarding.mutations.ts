import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import type { WorkspaceType } from "../schema";

/**
 * Crea organization + membership(owner) de forma atómica.
 *
 * Usa la función Postgres `create_organization_with_owner` (SECURITY DEFINER). ¿Por qué
 * una función y no dos inserts? Es el bootstrap de tenancy: el usuario todavía no tiene
 * ninguna membership, así que las políticas RLS normales (“solo tu org”) bloquearían los
 * inserts. La función corre con privilegios controlados y, de forma segura, sólo deja al
 * **caller** (`auth.uid()`) como owner de SU nueva organization. Ver la migración.
 *
 * El `slug` se deriva del nombre y puede chocar con el de otro workspace (dos consultoras
 * "RRHH"). En vez de tirarle el error al usuario, reintentamos con un sufijo numérico
 * (`rrhh`, `rrhh-2`, `rrhh-3`, …). Es a prueba de carreras: si dos altas simultáneas pisan
 * el mismo slug, la que pierde reintenta con el siguiente.
 */

const MAX_SLUG_ATTEMPTS = 6;

/** Choque contra el índice único de slug de `organizations` (código 23505). */
function isSlugTaken(err: unknown): boolean {
  const e = err as { code?: string; constraint_name?: string; message?: string } | null;
  if (e?.code !== "23505") return false;
  return (
    e.constraint_name === "organizations_slug_idx" ||
    (e.message ?? "").includes("organizations_slug_idx")
  );
}

export async function createOrganizationWithOwner({
  name,
  slug,
  ownerId,
  workspaceType,
}: {
  name: string;
  slug: string;
  ownerId: string;
  workspaceType: WorkspaceType;
}): Promise<{ organizationId: string }> {
  const db = await getDb();

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    try {
      const rows = await db.rls(
        (tx) =>
          tx.execute<{ id: string }>(
            sql`select create_organization_with_owner(${name}, ${candidate}, ${ownerId}, ${workspaceType}::workspace_type) as id`,
          ),
        "db.onboarding.create-org",
      );
      const organizationId = rows[0]?.id;
      if (!organizationId) throw new Error("No se pudo crear la organization.");
      return { organizationId };
    } catch (err) {
      if (isSlugTaken(err) && attempt < MAX_SLUG_ATTEMPTS - 1) continue;
      throw err;
    }
  }

  // Inalcanzable: el loop sale por return o por throw.
  throw new Error("No se pudo generar un identificador único para el workspace.");
}

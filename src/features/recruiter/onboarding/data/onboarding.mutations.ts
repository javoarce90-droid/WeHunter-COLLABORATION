import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

/**
 * Crea organization + membership(owner) de forma atómica.
 *
 * Usa la función Postgres `create_organization_with_owner` (SECURITY DEFINER). ¿Por qué
 * una función y no dos inserts? Es el bootstrap de tenancy: el usuario todavía no tiene
 * ninguna membership, así que las políticas RLS normales (“solo tu org”) bloquearían los
 * inserts. La función corre con privilegios controlados y, de forma segura, sólo deja al
 * **caller** (`auth.uid()`) como owner de SU nueva organization. Ver la migración.
 */
export async function createOrganizationWithOwner({
  name,
  slug,
  ownerId,
}: {
  name: string;
  slug: string;
  ownerId: string;
}): Promise<{ organizationId: string }> {
  const db = await getDb();

  const rows = await db.rls((tx) =>
    tx.execute<{ id: string }>(
      sql`select create_organization_with_owner(${name}, ${slug}, ${ownerId}) as id`,
    ),
    "db.onboarding.create-org",
  );

  const organizationId = rows[0]?.id;
  if (!organizationId) {
    throw new Error("No se pudo crear la organization.");
  }
  return { organizationId };
}

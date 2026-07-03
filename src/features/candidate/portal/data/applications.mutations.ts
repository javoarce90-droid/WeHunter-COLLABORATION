import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

/** Invoca withdraw_application (Fase 1): borra la postulación si es del usuario autenticado. */
export async function withdrawApplicationRpc(applicationId: string): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) => tx.execute(sql`select withdraw_application(${applicationId}::uuid)`),
    "db.portal.withdrawApplication",
  );
}

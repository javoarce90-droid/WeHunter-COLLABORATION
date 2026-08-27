import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { plans, type Plan } from "@/db/schema";
import type { WorkspaceType } from "@/lib/auth/session";

/**
 * Lecturas del catálogo de planes. Tabla chica y casi estática — `cache()` por request para
 * no repetir la query aunque la pidan varios lados (layout + page + form de onboarding).
 * RLS: `read_all` deja leerla a cualquier autenticado.
 */

export const getActivePlans = cache(async (): Promise<Plan[]> => {
  const db = await getDb();
  return db.rls(
    (tx) => tx.select().from(plans).where(eq(plans.active, true)).orderBy(plans.sortOrder),
    "db.plans",
  );
});

export async function getPlanById(id: string): Promise<Plan | null> {
  const all = await getActivePlans();
  return all.find((p) => p.id === id) ?? null;
}

export async function getPlanByCode(code: string): Promise<Plan | null> {
  const all = await getActivePlans();
  return all.find((p) => p.code === code) ?? null;
}

/** El plan self-serve que corresponde a un tipo de workspace (freelance→freelancer,
 *  team→teams). `enterprise` y las orgs legado sin tipo no tienen plan. */
export async function getPlanForWorkspaceType(
  workspaceType: WorkspaceType | null,
): Promise<Plan | null> {
  if (!workspaceType) return null;
  const all = await getActivePlans();
  return all.find((p) => p.workspaceType === workspaceType) ?? null;
}

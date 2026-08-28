import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb, admin } from "@/db/client";
import { plans, type Plan } from "@/db/schema";
import type { WorkspaceType } from "@/lib/auth/session";

/**
 * Lecturas del catálogo de planes. Tabla chica y casi estática (cambia solo por migración o,
 * más adelante, un backoffice). Se cachea:
 *  - `cache()` de React → una sola query por request aunque la pidan layout + page + form.
 *  - caché de módulo con TTL corto → ~una query por minuto por instancia, no por navegación
 *    (evita sumar una transacción RLS al shell en cada page load — ver database.md).
 * RLS: la política `read_all` deja leerla a cualquier autenticado.
 */

const CACHE_TTL_MS = 60_000;
let moduleCache: { at: number; plans: Plan[] } | null = null;

export const getActivePlans = cache(async (): Promise<Plan[]> => {
  if (moduleCache && Date.now() - moduleCache.at < CACHE_TTL_MS) {
    return moduleCache.plans;
  }
  const db = await getDb();
  const rows = await db.rls(
    (tx) => tx.select().from(plans).where(eq(plans.active, true)).orderBy(plans.sortOrder),
    "db.plans",
  );
  moduleCache = { at: Date.now(), plans: rows };
  return rows;
});

export async function getPlanById(id: string): Promise<Plan | null> {
  const all = await getActivePlans();
  return all.find((p) => p.id === id) ?? null;
}

/** Un plan por id sin sesión (webhook de dLocal). Cliente admin. */
export async function getPlanByIdAsSystem(id: string): Promise<Plan | null> {
  const rows = await admin.select().from(plans).where(eq(plans.id, id)).limit(1);
  return rows[0] ?? null;
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

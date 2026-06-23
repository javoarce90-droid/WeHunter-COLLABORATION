import { count, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobs, candidates, applications, type Application } from "@/db/schema";
import type { DashboardCounts } from "../domain/obtener-kpis";

/**
 * Lecturas agregadas para el dashboard. Cliente RLS (nunca admin). Filtramos por
 * organizationId además del RLS: el usuario puede pertenecer a varias orgs y el
 * dashboard es el de SU workspace activo.
 *
 * PERFORMANCE: las tres cuentas se traen en UNA sola transacción RLS (ver database.md
 * regla #3). Antes eran 3 transacciones independientes -> 3× (BEGIN + set claims + set
 * role + COMMIT). Ahora pagamos ese overhead una vez y corremos los 3 SELECT juntos.
 */

type Stage = Application["stage"];

export async function getDashboardCounts(
  organizationId: string,
): Promise<DashboardCounts> {
  const db = await getDb();

  return db.rls(async (tx) => {
    // Dentro de una sola transacción: una sola vez el overhead de RLS para las 3 lecturas.
    const [jobRows, candRows, stageRows] = await Promise.all([
      tx
        .select({ status: jobs.status, n: count() })
        .from(jobs)
        .where(eq(jobs.organizationId, organizationId))
        .groupBy(jobs.status),
      tx
        .select({ n: count() })
        .from(candidates)
        .where(eq(candidates.organizationId, organizationId)),
      tx
        .select({ stage: applications.stage, n: count() })
        .from(applications)
        .where(eq(applications.organizationId, organizationId))
        .groupBy(applications.stage),
    ]);

    let total = 0;
    let open = 0;
    for (const r of jobRows) {
      const n = Number(r.n);
      total += n;
      if (r.status === "open") open += n;
    }

    const byStage: Partial<Record<Stage, number>> = {};
    for (const r of stageRows) {
      byStage[r.stage] = Number(r.n);
    }

    return {
      jobs: { total, open },
      candidates: Number(candRows[0]?.n ?? 0),
      byStage,
    };
  }, "db.dashboard.kpis");
}

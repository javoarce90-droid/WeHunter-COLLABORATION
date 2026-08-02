import { and, count, eq, gte, isNull, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobs, candidates, applications, memberships, type Application } from "@/db/schema";
import type { DashboardCounts } from "../domain/obtener-kpis";

/**
 * Lecturas agregadas para el dashboard. Cliente RLS (nunca admin). Filtramos por
 * organizationId además del RLS: el usuario puede pertenecer a varias orgs y el
 * dashboard es el de SU workspace activo.
 *
 * PERFORMANCE: todas las cuentas se traen en UNA sola transacción RLS (ver database.md
 * regla #3): pagamos el overhead de RLS (BEGIN + set claims + set role + COMMIT) una sola
 * vez y corremos los SELECT juntos.
 */

type Stage = Application["stage"];

export async function getDashboardCounts(
  organizationId: string,
): Promise<DashboardCounts> {
  const db = await getDb();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return db.rls(async (tx) => {
    const [jobRows, candRows, stageRows, pendingRows, hiredRows, memberRows] = await Promise.all([
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
      // Postulaciones en bandeja, sin decisión tomada — mismo criterio que pendingCount
      // por-búsqueda (jobs.queries.ts), acá agregado a nivel org.
      tx
        .select({ n: count() })
        .from(applications)
        .where(
          and(
            eq(applications.organizationId, organizationId),
            isNull(applications.pipelineEnteredAt),
            ne(applications.stage, "rejected"),
          ),
        ),
      tx
        .select({ n: count() })
        .from(applications)
        .where(
          and(
            eq(applications.organizationId, organizationId),
            eq(applications.stage, "hired"),
            gte(applications.updatedAt, startOfMonth),
          ),
        ),
      tx
        .select({ n: count() })
        .from(memberships)
        .where(
          and(eq(memberships.organizationId, organizationId), eq(memberships.status, "active")),
        ),
    ]);

    let total = 0;
    let open = 0;
    for (const r of jobRows) {
      const n = Number(r.n);
      // Las archivadas quedan fuera del total: son búsquedas sacadas de la vista activa.
      if (r.status !== "archived") total += n;
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
      pendingCount: Number(pendingRows[0]?.n ?? 0),
      hiredThisMonth: Number(hiredRows[0]?.n ?? 0),
      activeMembersCount: Number(memberRows[0]?.n ?? 0),
    };
  }, "db.dashboard.kpis");
}

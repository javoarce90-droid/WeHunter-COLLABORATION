import { count, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobs, candidates, applications, type Application } from "@/db/schema";

/**
 * Lecturas agregadas para el dashboard. Cliente RLS (nunca admin). Filtramos por
 * organizationId además del RLS: el usuario puede pertenecer a varias orgs y el
 * dashboard es el de SU workspace activo.
 */

type Stage = Application["stage"];

export async function getJobCounts(
  organizationId: string,
): Promise<{ total: number; open: number }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({ status: jobs.status, n: count() })
      .from(jobs)
      .where(eq(jobs.organizationId, organizationId))
      .groupBy(jobs.status),
  );

  let total = 0;
  let open = 0;
  for (const r of rows) {
    const n = Number(r.n);
    total += n;
    if (r.status === "open") open += n;
  }
  return { total, open };
}

export async function getCandidateCount(
  organizationId: string,
): Promise<number> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({ n: count() })
      .from(candidates)
      .where(eq(candidates.organizationId, organizationId)),
  );
  return Number(rows[0]?.n ?? 0);
}

export async function getApplicationCountsByStage(
  organizationId: string,
): Promise<Partial<Record<Stage, number>>> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({ stage: applications.stage, n: count() })
      .from(applications)
      .where(eq(applications.organizationId, organizationId))
      .groupBy(applications.stage),
  );

  const byStage: Partial<Record<Stage, number>> = {};
  for (const r of rows) {
    byStage[r.stage] = Number(r.n);
  }
  return byStage;
}

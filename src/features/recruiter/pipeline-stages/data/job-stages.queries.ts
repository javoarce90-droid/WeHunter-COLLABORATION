import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobStages, applications } from "@/db/schema";
import type { JobStage, StageKind } from "../schema";

/** Etapas del pipeline de una búsqueda, en orden de tablero. */
export async function listJobStages(
  jobId: string,
  organizationId: string,
): Promise<JobStage[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          id: jobStages.id,
          name: jobStages.name,
          position: jobStages.position,
          slaDays: jobStages.slaDays,
          kind: jobStages.kind,
        })
        .from(jobStages)
        .where(and(eq(jobStages.jobId, jobId), eq(jobStages.organizationId, organizationId)))
        .orderBy(asc(jobStages.position)),
    "db.job-stages.by-job",
  );
  return rows.map((r) => ({ ...r, kind: r.kind as StageKind }));
}

/** Una etapa puntual, validada contra la búsqueda a la que dice pertenecer. Es la guarda
 *  que evita mover una postulación a una etapa de OTRA búsqueda. */
export async function getJobStage(
  stageId: string,
  organizationId: string,
): Promise<(JobStage & { jobId: string }) | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          id: jobStages.id,
          jobId: jobStages.jobId,
          name: jobStages.name,
          position: jobStages.position,
          slaDays: jobStages.slaDays,
          kind: jobStages.kind,
        })
        .from(jobStages)
        .where(and(eq(jobStages.id, stageId), eq(jobStages.organizationId, organizationId)))
        .limit(1),
    "db.job-stages.get",
  );
  const r = rows[0];
  return r ? { ...r, kind: r.kind as StageKind } : null;
}

/** Cuántas postulaciones hay paradas en una etapa. Bloquea borrarla si no está vacía. */
export async function countApplicationsInJobStage(stageId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ n: sql<number>`count(*)::int` })
        .from(applications)
        .where(eq(applications.stageId, stageId)),
    "db.job-stages.count-applications",
  );
  return rows[0]?.n ?? 0;
}

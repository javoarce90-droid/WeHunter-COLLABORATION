import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobStageTemplates } from "@/db/schema";
import type { JobStage, StageKind } from "../schema";

/** Cuántas filas tiene la plantilla — para el checklist de Día 1 (¿ya está sembrada?), sin
 *  traer las columnas completas. */
export async function countStageTemplates(organizationId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ n: sql<number>`count(*)::int` })
        .from(jobStageTemplates)
        .where(eq(jobStageTemplates.organizationId, organizationId)),
    "db.job-stage-templates.count",
  );
  return rows[0]?.n ?? 0;
}

/** Plantilla de etapas por defecto de la organización, en orden de tablero. */
export async function listStageTemplates(organizationId: string): Promise<JobStage[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          id: jobStageTemplates.id,
          name: jobStageTemplates.name,
          position: jobStageTemplates.position,
          slaDays: jobStageTemplates.slaDays,
          kind: jobStageTemplates.kind,
        })
        .from(jobStageTemplates)
        .where(eq(jobStageTemplates.organizationId, organizationId))
        .orderBy(asc(jobStageTemplates.position)),
    "db.job-stage-templates.list",
  );
  return rows.map((r) => ({ ...r, kind: r.kind as StageKind }));
}

export async function getStageTemplate(
  stageId: string,
  organizationId: string,
): Promise<JobStage | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          id: jobStageTemplates.id,
          name: jobStageTemplates.name,
          position: jobStageTemplates.position,
          slaDays: jobStageTemplates.slaDays,
          kind: jobStageTemplates.kind,
        })
        .from(jobStageTemplates)
        .where(and(eq(jobStageTemplates.id, stageId), eq(jobStageTemplates.organizationId, organizationId)))
        .limit(1),
    "db.job-stage-templates.get",
  );
  const r = rows[0];
  return r ? { ...r, kind: r.kind as StageKind } : null;
}

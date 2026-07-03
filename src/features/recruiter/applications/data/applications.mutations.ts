import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, applicationEvents } from "@/db/schema";
import type { ApplicationStage, RejectionReason } from "../schema";
import type { ApplicationRow } from "../domain/postular-candidato";

/** Escrituras del pipeline. Cliente RLS; el organizationId acota a la org activa. */

function toRow(r: typeof applications.$inferSelect): ApplicationRow {
  return {
    id: r.id,
    organizationId: r.organizationId,
    jobId: r.jobId,
    candidateId: r.candidateId,
    stage: r.stage as ApplicationStage,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/**
 * Crea la postulación Y su evento de historial inicial (fromStage=null) en UNA transacción,
 * para que el historial nunca quede inconsistente con el estado. El evento habilita las
 * métricas de funnel y time-in-stage (§5/§12 del backlog).
 */
export async function insertApplication(args: {
  organizationId: string;
  jobId: string;
  candidateId: string;
  stage: ApplicationStage;
}): Promise<ApplicationRow> {
  const db = await getDb();
  const row = await db.rls(async (tx) => {
    const [app] = await tx
      .insert(applications)
      .values({
        organizationId: args.organizationId,
        jobId: args.jobId,
        candidateId: args.candidateId,
        stage: args.stage,
      })
      .returning();

    await tx.insert(applicationEvents).values({
      organizationId: args.organizationId,
      applicationId: app!.id,
      fromStage: null, // evento de creación
      toStage: args.stage,
      changedBy: db.userId, // profileId del token RLS
    });

    return app!;
  }, "db.applications.insert");

  return toRow(row);
}

/**
 * Mueve la postulación de etapa Y registra el evento (fromStage→toStage) en UNA transacción.
 * `fromStage` lo provee el dominio (la etapa actual antes del cambio). `eventMeta` es opcional
 * y hoy solo lo usa el rechazo (motivo + nota, privados del recruiter, quedan en el evento).
 */
export async function updateApplicationStage(
  applicationId: string,
  fromStage: ApplicationStage,
  toStage: ApplicationStage,
  eventMeta?: { rejectionReason?: RejectionReason; rejectionNote?: string },
): Promise<ApplicationRow> {
  const db = await getDb();
  const row = await db.rls(async (tx) => {
    const [app] = await tx
      .update(applications)
      .set({ stage: toStage, updatedAt: new Date() })
      .where(eq(applications.id, applicationId))
      .returning();

    await tx.insert(applicationEvents).values({
      organizationId: app!.organizationId,
      applicationId: app!.id,
      fromStage,
      toStage,
      changedBy: db.userId,
      rejectionReason: eventMeta?.rejectionReason,
      rejectionNote: eventMeta?.rejectionNote,
    });

    return app!;
  }, "db.applications.update-stage");

  return toRow(row);
}

export async function setApplicationFavorite(
  applicationId: string,
  isFavorite: boolean,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(applications)
        .set({ isFavorite, updatedAt: new Date() })
        .where(eq(applications.id, applicationId)),
    "db.applications.set-favorite",
  );
}

export async function saveApplicationScore(
  applicationId: string,
  score: number,
  summary: string,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(applications)
        .set({ aiScore: score, aiSummary: summary, updatedAt: new Date() })
        .where(eq(applications.id, applicationId)),
    "db.applications.save-score",
  );
}

export async function deleteApplication(
  applicationId: string,
  organizationId: string,
): Promise<{ deleted: boolean }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .delete(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.organizationId, organizationId),
        ),
      )
      .returning({ id: applications.id }),
    "db.applications.delete",
  );
  return { deleted: rows.length > 0 };
}

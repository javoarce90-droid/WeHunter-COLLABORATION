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
 *
 * `postularCandidato` ya chequea duplicados antes de llamar acá, pero ese check-then-insert no
 * es atómico (dos requests casi simultáneos pueden pasar el check antes de que el primer insert
 * commitee). El `onConflictDoNothing` contra `applications_job_candidate_unique` es el respaldo:
 * si hubo carrera, no se inserta una segunda fila y devolvemos `null` en vez de tirar.
 */
export async function insertApplication(args: {
  organizationId: string;
  jobId: string;
  candidateId: string;
  stage: ApplicationStage;
  /** El alta hecha por el recruiter (sourcing desde el pool) entra directo al tablero: ya
   *  hubo una decisión de trabajarlo. Las postulaciones que llegan solas (Career Site,
   *  portal) nacen en la bandeja y esperan el triage. */
  pipelineEntered?: boolean;
}): Promise<ApplicationRow | null> {
  const db = await getDb();
  const row = await db.rls(async (tx) => {
    const [app] = await tx
      .insert(applications)
      .values({
        organizationId: args.organizationId,
        jobId: args.jobId,
        candidateId: args.candidateId,
        stage: args.stage,
        pipelineEnteredAt: args.pipelineEntered ? new Date() : null,
      })
      .onConflictDoNothing({ target: [applications.jobId, applications.candidateId] })
      .returning();

    if (!app) return null;

    await tx.insert(applicationEvents).values({
      organizationId: args.organizationId,
      applicationId: app.id,
      fromStage: null, // evento de creación
      toStage: args.stage,
      changedBy: db.userId, // profileId del token RLS
    });

    return app;
  }, "db.applications.insert");

  return row ? toRow(row) : null;
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

/**
 * Marca el ingreso al pipeline: setea `pipeline_entered_at` y mueve a la etapa destino,
 * con su evento de historial, en UNA transacción. Espeja a `updateApplicationStage` — son
 * dos escrituras distintas a propósito: mover de etapa dentro del tablero no vuelve a tocar
 * la fecha de ingreso.
 */
export async function setPipelineEntered(
  applicationId: string,
  fromStage: ApplicationStage,
  toStage: ApplicationStage,
): Promise<ApplicationRow> {
  const db = await getDb();
  const row = await db.rls(async (tx) => {
    const [app] = await tx
      .update(applications)
      .set({ stage: toStage, pipelineEnteredAt: new Date(), updatedAt: new Date() })
      .where(eq(applications.id, applicationId))
      .returning();

    await tx.insert(applicationEvents).values({
      organizationId: app!.organizationId,
      applicationId: app!.id,
      fromStage,
      toStage,
      changedBy: db.userId,
    });

    return app!;
  }, "db.applications.enter-pipeline");

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

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, applicationEvents, jobStages } from "@/db/schema";
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
 * Toda postulación creada acá nace en la bandeja de Postulados (`pipelineEnteredAt: null`):
 * tanto la auto-postulación (que en realidad no pasa por acá, ver apply_to_career_site_job)
 * como el alta manual desde el pool. Pasar al pipeline es una decisión aparte y explícita,
 * ver `pasarAlPipeline`.
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
}): Promise<ApplicationRow | null> {
  const db = await getDb();
  const row = await db.rls(async (tx) => {
    // La etapa propia de la búsqueda equivalente al valor del enum de arranque — mantiene
    // `stage_id` en sync desde el alta, para que el tablero por-búsqueda (que lee por id)
    // ya la vea sin esperar a un primer movimiento manual.
    const [seedStage] = await tx
      .select({ id: jobStages.id })
      .from(jobStages)
      .where(and(eq(jobStages.jobId, args.jobId), eq(jobStages.legacyStage, args.stage)))
      .limit(1);

    const [app] = await tx
      .insert(applications)
      .values({
        organizationId: args.organizationId,
        jobId: args.jobId,
        candidateId: args.candidateId,
        stage: args.stage,
        stageId: seedStage?.id,
        pipelineEnteredAt: null,
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

    // Mantiene stage_id en sync mientras este mutation legacy (por enum) siga en uso.
    const [stageRow] = await tx
      .select({ id: jobStages.id })
      .from(jobStages)
      .where(and(eq(jobStages.jobId, app!.jobId), eq(jobStages.legacyStage, toStage)))
      .limit(1);
    if (stageRow) {
      await tx
        .update(applications)
        .set({ stageId: stageRow.id, stageEnteredAt: new Date() })
        .where(eq(applications.id, applicationId));
    }

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

    // Mantiene stage_id en sync: la postulación deja la etapa "inbox" y entra a una etapa
    // real del tablero por-búsqueda.
    const [stageRow] = await tx
      .select({ id: jobStages.id })
      .from(jobStages)
      .where(and(eq(jobStages.jobId, app!.jobId), eq(jobStages.legacyStage, toStage)))
      .limit(1);
    if (stageRow) {
      await tx
        .update(applications)
        .set({ stageId: stageRow.id, stageEnteredAt: new Date() })
        .where(eq(applications.id, applicationId));
    }

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

/**
 * Mueve una postulación dentro del tablero de SU búsqueda: dep de `moverAEtapa`
 * (`mover-a-etapa.ts`). A diferencia de `updateApplicationStage`, ya recibe el id de etapa
 * directo (sin derivarlo por enum) — `legacyStage` solo mantiene en sync la columna vieja
 * para los consumidores que todavía la leen. Resetea `stage_entered_at`: es lo que hace que
 * el contador de días en la etapa arranque de nuevo en cada movimiento.
 */
export async function moveToStage(args: {
  applicationId: string;
  toStageId: string;
  legacyStage: ApplicationStage;
}): Promise<void> {
  const db = await getDb();
  await db.rls(async (tx) => {
    const [before] = await tx
      .select({ stage: applications.stage })
      .from(applications)
      .where(eq(applications.id, args.applicationId))
      .limit(1);

    const [app] = await tx
      .update(applications)
      .set({
        stageId: args.toStageId,
        stage: args.legacyStage,
        stageEnteredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(applications.id, args.applicationId))
      .returning();

    await tx.insert(applicationEvents).values({
      organizationId: app!.organizationId,
      applicationId: app!.id,
      fromStage: (before?.stage as ApplicationStage) ?? null,
      toStage: args.legacyStage,
      changedBy: db.userId,
    });
  }, "db.applications.move-to-stage");
}

export async function saveApplicationScore(
  applicationId: string,
  score: number,
  summary: string,
  redFlags: string[],
  breakdown: {
    experiencia: number;
    skillsTecnicos: number;
    seniority: number;
    idiomas: number;
    ubicacion: number;
  },
  strengths: string[],
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(applications)
        .set({
          aiScore: score,
          aiSummary: summary,
          aiRedFlags: redFlags,
          aiBreakdown: breakdown,
          aiStrengths: strengths,
          updatedAt: new Date(),
        })
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

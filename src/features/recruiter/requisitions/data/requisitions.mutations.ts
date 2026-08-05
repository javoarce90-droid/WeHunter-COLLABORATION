import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobs, requisitions } from "@/db/schema";
import type { RequisitionDraft } from "../domain/cargar-solicitud";

/** Escrituras de solicitudes (§17). Cliente RLS; el organizationId acota a la org activa. */

/** Camino HM: inserta directo por RLS (a diferencia del camino Cliente, que pasa por una
 *  función SECURITY DEFINER porque no hay sesión) — el HM ya está autenticado, la policy
 *  `tenant_isolation` de `requisitions` alcanza para el aislamiento por tenant. */
export async function insertRequisitionFromHM(args: {
  organizationId: string;
  createdByProfileId: string;
  assignedToMembershipId: string;
  draft: RequisitionDraft;
}): Promise<{ requisitionId: string }> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .insert(requisitions)
        .values({
          organizationId: args.organizationId,
          createdByProfileId: args.createdByProfileId,
          assignedToMembershipId: args.assignedToMembershipId,
          ...args.draft,
        })
        .returning({ id: requisitions.id }),
    "db.requisitions.insert-from-hm",
  );
  return { requisitionId: rows[0]!.id };
}

/**
 * Aprueba la solicitud y crea la búsqueda vinculada en UNA transacción: si el insert del
 * job falla, la solicitud no queda marcada como aprobada sin su job.
 *
 * El `update` filtra por `status = 'pending'`: si otro recruiter aprobó la misma solicitud
 * entre la lectura del dominio y este write, no toca cero filas y abortamos la transacción
 * en vez de crear un segundo job para la misma solicitud.
 */
export async function approveAndCreateJob(args: {
  requisitionId: string;
  organizationId: string;
  reviewedBy: string;
  assignedTo: string;
  reviewNote: string | null;
}): Promise<{ jobId: string }> {
  const db = await getDb();
  return db.rls(async (tx) => {
    const found = await tx
      .select()
      .from(requisitions)
      .where(
        and(
          eq(requisitions.id, args.requisitionId),
          eq(requisitions.organizationId, args.organizationId),
        ),
      )
      .limit(1);

    const req = found[0];
    if (!req) throw new Error("requisition no encontrada al aprobar");

    const insertedJob = await tx
      .insert(jobs)
      .values({
        organizationId: req.organizationId,
        clientId: req.clientId,
        title: req.title,
        position: req.position,
        status: "draft",
        jobArea: req.jobArea,
        location: req.location,
        modality: req.modality,
        seniority: req.seniority,
        employmentType: req.employmentType,
        skills: req.skills,
        objectives: req.objectives,
        requirements: req.requirements,
        responsibilities: req.responsibilities,
        benefits: req.benefits,
        createdBy: args.reviewedBy,
        assignedTo: args.assignedTo,
      })
      .returning({ id: jobs.id });

    const jobId = insertedJob[0]!.id;

    const updated = await tx
      .update(requisitions)
      .set({
        status: "approved",
        jobId,
        reviewNote: args.reviewNote,
        reviewedBy: args.reviewedBy,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(requisitions.id, args.requisitionId),
          eq(requisitions.organizationId, args.organizationId),
          eq(requisitions.status, "pending"),
        ),
      )
      .returning({ id: requisitions.id });

    if (updated.length === 0) {
      throw new Error("la solicitud ya había sido revisada");
    }

    return { jobId };
  }, "db.requisitions.approve");
}

export async function rejectRequisition(args: {
  requisitionId: string;
  organizationId: string;
  reviewedBy: string;
  reviewNote: string;
}): Promise<{ updated: boolean }> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .update(requisitions)
        .set({
          status: "rejected",
          reviewNote: args.reviewNote,
          reviewedBy: args.reviewedBy,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(requisitions.id, args.requisitionId),
            eq(requisitions.organizationId, args.organizationId),
            eq(requisitions.status, "pending"),
          ),
        )
        .returning({ id: requisitions.id }),
    "db.requisitions.reject",
  );
  return { updated: rows.length > 0 };
}

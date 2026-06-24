import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { offers, applications, applicationEvents, jobs } from "@/db/schema";
import type { OfferStatus } from "../schema";
import type { OfferRow, CrearOfertaInput } from "../domain/crear-oferta";

export async function insertOffer(
  data: CrearOfertaInput & { organizationId: string; createdBy: string | null },
): Promise<OfferRow> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .insert(offers)
      .values({
        organizationId: data.organizationId,
        jobId: data.jobId,
        applicationId: data.applicationId,
        title: data.title,
        salaryAmount: data.salaryAmount ?? null,
        salaryCurrency: data.salaryCurrency ?? null,
        benefits: data.benefits ?? null,
        startDate: data.startDate ?? null,
        validUntil: data.validUntil ?? null,
        body: data.body ?? null,
        createdBy: data.createdBy,
      })
      .returning(),
    "db.offers.insert",
  );
  const r = rows[0]!;
  return {
    id: r.id,
    organizationId: r.organizationId,
    jobId: r.jobId,
    applicationId: r.applicationId,
    title: r.title,
    status: r.status as OfferStatus,
  };
}

export async function updateOfferFields(
  offerId: string,
  patch: {
    title: string;
    salaryAmount?: number;
    salaryCurrency?: string;
    benefits?: string;
    startDate?: string;
    validUntil?: string;
    body?: string;
  },
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(offers)
        .set({
          title: patch.title,
          salaryAmount: patch.salaryAmount ?? null,
          salaryCurrency: patch.salaryCurrency ?? null,
          benefits: patch.benefits ?? null,
          startDate: patch.startDate ?? null,
          validUntil: patch.validUntil ?? null,
          body: patch.body ?? null,
          updatedAt: new Date(),
        })
        .where(eq(offers.id, offerId)),
    "db.offers.update-fields",
  );
}

export async function updateOfferStatus(
  offerId: string,
  status: OfferStatus,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(offers)
        .set({ status, updatedAt: new Date() })
        .where(eq(offers.id, offerId)),
    "db.offers.update-status",
  );
}

/**
 * Aceptar una oferta dispara tres efectos en UNA transacción, para no dejar estados
 * inconsistentes (oferta aceptada con la búsqueda abierta, p. ej.):
 *  1. offer → accepted
 *  2. application → hired (+ evento de historial, como cualquier move)
 *  3. job → closed
 * El contrato lo garantiza el dominio (cambiarEstadoOferta valida la transición antes).
 */
export async function acceptOfferTx(offerId: string): Promise<void> {
  const db = await getDb();
  await db.rls(async (tx) => {
    const [offer] = await tx
      .update(offers)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(offers.id, offerId))
      .returning({
        organizationId: offers.organizationId,
        jobId: offers.jobId,
        applicationId: offers.applicationId,
      });

    if (!offer) return;

    // Contratar al candidato (si no estaba ya en una etapa terminal).
    const [app] = await tx
      .select({ id: applications.id, stage: applications.stage })
      .from(applications)
      .where(eq(applications.id, offer.applicationId))
      .limit(1);

    if (app && app.stage !== "hired" && app.stage !== "rejected") {
      await tx
        .update(applications)
        .set({ stage: "hired", updatedAt: new Date() })
        .where(eq(applications.id, app.id));
      await tx.insert(applicationEvents).values({
        organizationId: offer.organizationId,
        applicationId: app.id,
        fromStage: app.stage,
        toStage: "hired",
        changedBy: db.userId,
      });
    }

    // Cerrar la búsqueda.
    await tx
      .update(jobs)
      .set({ status: "closed", updatedAt: new Date() })
      .where(eq(jobs.id, offer.jobId));
  }, "db.offers.accept");
}

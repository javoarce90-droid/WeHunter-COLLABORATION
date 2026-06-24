import { and, eq, desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { offers, applications, candidates } from "@/db/schema";
import type { OfferStatus } from "../schema";

export type OfferListRow = {
  id: string;
  title: string;
  status: OfferStatus;
  salaryAmount: number | null;
  salaryCurrency: string | null;
  applicationId: string;
  candidateName: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Ofertas de una búsqueda, con el nombre del candidato. Una query con join, con límite. */
export async function listOffersByJob(
  jobId: string,
  organizationId: string,
): Promise<OfferListRow[]> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        id: offers.id,
        title: offers.title,
        status: offers.status,
        salaryAmount: offers.salaryAmount,
        salaryCurrency: offers.salaryCurrency,
        applicationId: offers.applicationId,
        candidateName: candidates.fullName,
        createdAt: offers.createdAt,
        updatedAt: offers.updatedAt,
      })
      .from(offers)
      .innerJoin(applications, eq(offers.applicationId, applications.id))
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .where(and(eq(offers.jobId, jobId), eq(offers.organizationId, organizationId)))
      .orderBy(desc(offers.createdAt))
      .limit(100),
    "db.offers.by-job",
  );
  return rows.map((r) => ({ ...r, status: r.status as OfferStatus }));
}

export type OfferDetail = {
  id: string;
  jobId: string;
  applicationId: string;
  title: string;
  salaryAmount: number | null;
  salaryCurrency: string | null;
  benefits: string | null;
  startDate: string | null;
  validUntil: string | null;
  body: string | null;
  status: OfferStatus;
  candidateName: string;
  candidateEmail: string | null;
  createdAt: Date;
};

/** Detalle completo de una oferta (drawer y vista de impresión). */
export async function getOfferDetail(
  offerId: string,
  organizationId: string,
): Promise<OfferDetail | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        id: offers.id,
        jobId: offers.jobId,
        applicationId: offers.applicationId,
        title: offers.title,
        salaryAmount: offers.salaryAmount,
        salaryCurrency: offers.salaryCurrency,
        benefits: offers.benefits,
        startDate: offers.startDate,
        validUntil: offers.validUntil,
        body: offers.body,
        status: offers.status,
        candidateName: candidates.fullName,
        candidateEmail: candidates.email,
        createdAt: offers.createdAt,
      })
      .from(offers)
      .innerJoin(applications, eq(offers.applicationId, applications.id))
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .where(and(eq(offers.id, offerId), eq(offers.organizationId, organizationId)))
      .limit(1),
    "db.offers.detail",
  );
  if (!rows[0]) return null;
  return { ...rows[0], status: rows[0].status as OfferStatus };
}

/** Estado mínimo de una oferta para la máquina de estados del dominio. */
export async function getOfferStatusRow(
  offerId: string,
  organizationId: string,
): Promise<{ id: string; status: OfferStatus; applicationId: string; jobId: string } | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        id: offers.id,
        status: offers.status,
        applicationId: offers.applicationId,
        jobId: offers.jobId,
      })
      .from(offers)
      .where(and(eq(offers.id, offerId), eq(offers.organizationId, organizationId)))
      .limit(1),
    "db.offers.status-row",
  );
  if (!rows[0]) return null;
  return { ...rows[0], status: rows[0].status as OfferStatus };
}

import { randomBytes } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  shortlists,
  shortlistCandidates,
  shortlistShares,
  shortlistFeedback,
  shortlistCandidateComments,
  applications,
} from "@/db/schema";
import type { FeedbackDecision } from "@/features/company/shortlist-review/domain/registrar-feedback";

/** Escrituras de shortlists. Cliente RLS; el organizationId acota a la org activa. */

/** Token URL-safe e impredecible para el link de la empresa. */
export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createShortlistWithCandidates(args: {
  organizationId: string;
  jobId: string;
  name: string;
  createdBy: string;
  applicationIds: string[];
}): Promise<{ shortlistId: string }> {
  const db = await getDb();
  return db.rls(async (tx) => {
    const inserted = await tx
      .insert(shortlists)
      .values({
        organizationId: args.organizationId,
        jobId: args.jobId,
        name: args.name,
        createdBy: args.createdBy,
      })
      .returning({ id: shortlists.id });

    const shortlistId = inserted[0]!.id;

    await tx.insert(shortlistCandidates).values(
      args.applicationIds.map((applicationId) => ({
        organizationId: args.organizationId,
        shortlistId,
        applicationId,
      })),
    );

    return { shortlistId };
  }, "db.shortlists.create");
}

/** De los applicationIds pedidos, devuelve los que realmente son del job y la org. */
export async function filterValidApplications(
  jobId: string,
  organizationId: string,
  applicationIds: string[],
): Promise<string[]> {
  if (applicationIds.length === 0) return [];
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.jobId, jobId),
          eq(applications.organizationId, organizationId),
          inArray(applications.id, applicationIds),
        ),
      ),
    "db.shortlists.validate-apps",
  );
  return rows.map((r) => r.id);
}

export async function createShare(args: {
  organizationId: string;
  shortlistId: string;
  token: string;
  expiresAt: Date | null;
  createdBy: string;
}): Promise<{ shareId: string; token: string }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .insert(shortlistShares)
      .values({
        organizationId: args.organizationId,
        shortlistId: args.shortlistId,
        token: args.token,
        expiresAt: args.expiresAt,
        createdBy: args.createdBy,
      })
      .returning({ id: shortlistShares.id }),
    "db.shortlists.share.create",
  );
  return { shareId: rows[0]!.id, token: args.token };
}

/** Compartir interno con un Hiring Manager (sin token real): sigue generando uno igual
 *  para no aflojar la constraint NOT NULL/unique de la columna, pero nunca se expone. */
export async function createShareForMembership(args: {
  organizationId: string;
  shortlistId: string;
  token: string;
  sharedWithMembershipId: string;
  createdBy: string;
}): Promise<{ shareId: string }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .insert(shortlistShares)
      .values({
        organizationId: args.organizationId,
        shortlistId: args.shortlistId,
        token: args.token,
        sharedWithMembershipId: args.sharedWithMembershipId,
        createdBy: args.createdBy,
      })
      .returning({ id: shortlistShares.id }),
    "db.shortlists.share.create-for-membership",
  );
  return { shareId: rows[0]!.id };
}

/** Feedback interno del HM (con sesión, vía RLS) — a diferencia de `submit_shortlist_feedback`
 *  (función SECURITY DEFINER del camino Cliente por token), acá no hace falta bypass: el HM
 *  ya está autenticado y la policy `tenant_isolation` alcanza. Mismo upsert de una decisión
 *  por candidato (constraint única en `shortlist_candidate_id`, compartida con el otro camino). */
export async function upsertShortlistFeedbackDirect(args: {
  organizationId: string;
  shortlistCandidateId: string;
  shareId: string;
  decision: FeedbackDecision;
  comment: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .insert(shortlistFeedback)
        .values({
          organizationId: args.organizationId,
          shortlistCandidateId: args.shortlistCandidateId,
          shareId: args.shareId,
          decision: args.decision,
          comment: args.comment,
        })
        .onConflictDoUpdate({
          target: shortlistFeedback.shortlistCandidateId,
          set: { shareId: args.shareId, decision: args.decision, comment: args.comment, updatedAt: new Date() },
        }),
    "db.shortlists.feedback.upsert-direct",
  );
}

export async function createShortlistCandidateComment(args: {
  organizationId: string;
  shortlistCandidateId: string;
  authorMembershipId: string;
  body: string;
}): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx.insert(shortlistCandidateComments).values({
        organizationId: args.organizationId,
        shortlistCandidateId: args.shortlistCandidateId,
        authorMembershipId: args.authorMembershipId,
        body: args.body,
      }),
    "db.shortlists.comments.create",
  );
}

/** Pedido de entrevista del Hiring Manager (con sesión, vía RLS) — contraparte de
 *  `request_shortlist_interview` (función definer del camino Cliente por token). */
export async function requestInterviewDirect(args: {
  organizationId: string;
  shortlistCandidateId: string;
  slots: Date[];
}): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(shortlistCandidates)
        .set({
          interviewRequestedAt: new Date(),
          interviewRequestedSlots: args.slots,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(shortlistCandidates.id, args.shortlistCandidateId),
            eq(shortlistCandidates.organizationId, args.organizationId),
          ),
        ),
    "db.shortlists.interview-request.direct",
  );
}

export async function revokeShare(
  shareId: string,
): Promise<{ revoked: boolean }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .update(shortlistShares)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(shortlistShares.id, shareId), isNull(shortlistShares.revokedAt)))
      .returning({ id: shortlistShares.id }),
    "db.shortlists.share.revoke",
  );
  return { revoked: rows.length > 0 };
}

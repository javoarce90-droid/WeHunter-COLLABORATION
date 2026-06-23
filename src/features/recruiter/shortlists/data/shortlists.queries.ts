import { and, eq, desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  shortlists,
  shortlistCandidates,
  shortlistShares,
  shortlistFeedback,
  applications,
  candidates,
} from "@/db/schema";
import type { ApplicationStage } from "@/features/recruiter/applications/schema";
import type { FeedbackDecision } from "@/features/company/shortlist-review/domain/registrar-feedback";

/** Lecturas de shortlists. Cliente RLS; filtramos por organization activa. */

export async function getShortlistById(
  shortlistId: string,
  organizationId: string,
): Promise<{ id: string } | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({ id: shortlists.id })
      .from(shortlists)
      .where(
        and(
          eq(shortlists.id, shortlistId),
          eq(shortlists.organizationId, organizationId),
        ),
      )
      .limit(1),
  );
  return rows[0] ?? null;
}

export async function getShareById(
  shareId: string,
  organizationId: string,
): Promise<{ id: string; revokedAt: Date | null } | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({ id: shortlistShares.id, revokedAt: shortlistShares.revokedAt })
      .from(shortlistShares)
      .where(
        and(
          eq(shortlistShares.id, shareId),
          eq(shortlistShares.organizationId, organizationId),
        ),
      )
      .limit(1),
  );
  return rows[0] ?? null;
}

export type ShortlistSummary = {
  id: string;
  name: string;
  createdAt: Date;
  candidateCount: number;
};

export async function listShortlistsByJob(
  jobId: string,
  organizationId: string,
): Promise<ShortlistSummary[]> {
  const db = await getDb();
  const lists = await db.rls((tx) =>
    tx
      .select()
      .from(shortlists)
      .where(
        and(eq(shortlists.jobId, jobId), eq(shortlists.organizationId, organizationId)),
      )
      .orderBy(desc(shortlists.createdAt)),
  );

  // Conteo de candidatos por shortlist (consulta simple por lista; los volúmenes son chicos).
  const result: ShortlistSummary[] = [];
  for (const sl of lists) {
    const cands = await db.rls((tx) =>
      tx
        .select({ id: shortlistCandidates.id })
        .from(shortlistCandidates)
        .where(eq(shortlistCandidates.shortlistId, sl.id)),
    );
    result.push({
      id: sl.id,
      name: sl.name,
      createdAt: sl.createdAt,
      candidateCount: cands.length,
    });
  }
  return result;
}

export type ShareRow = {
  id: string;
  shortlistId: string;
  token: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export async function listSharesByShortlist(
  shortlistId: string,
  organizationId: string,
): Promise<ShareRow[]> {
  const db = await getDb();
  return db.rls((tx) =>
    tx
      .select({
        id: shortlistShares.id,
        shortlistId: shortlistShares.shortlistId,
        token: shortlistShares.token,
        expiresAt: shortlistShares.expiresAt,
        revokedAt: shortlistShares.revokedAt,
        createdAt: shortlistShares.createdAt,
      })
      .from(shortlistShares)
      .where(
        and(
          eq(shortlistShares.shortlistId, shortlistId),
          eq(shortlistShares.organizationId, organizationId),
        ),
      )
      .orderBy(desc(shortlistShares.createdAt)),
  );
}

export type ShortlistCandidateWithFeedback = {
  shortlistCandidateId: string;
  fullName: string;
  email: string | null;
  stage: ApplicationStage;
  feedbackDecision: FeedbackDecision | null;
  feedbackComment: string | null;
};

/** Candidatos del shortlist con el feedback de la empresa (vista interna del reclutador). */
export async function listShortlistCandidates(
  shortlistId: string,
  organizationId: string,
): Promise<ShortlistCandidateWithFeedback[]> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        shortlistCandidateId: shortlistCandidates.id,
        fullName: candidates.fullName,
        email: candidates.email,
        stage: applications.stage,
        feedbackDecision: shortlistFeedback.decision,
        feedbackComment: shortlistFeedback.comment,
      })
      .from(shortlistCandidates)
      .innerJoin(applications, eq(shortlistCandidates.applicationId, applications.id))
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .leftJoin(
        shortlistFeedback,
        eq(shortlistFeedback.shortlistCandidateId, shortlistCandidates.id),
      )
      .where(
        and(
          eq(shortlistCandidates.shortlistId, shortlistId),
          eq(shortlistCandidates.organizationId, organizationId),
        ),
      ),
  );
  return rows.map((r) => ({
    shortlistCandidateId: r.shortlistCandidateId,
    fullName: r.fullName,
    email: r.email,
    stage: r.stage as ApplicationStage,
    feedbackDecision: (r.feedbackDecision as FeedbackDecision | null) ?? null,
    feedbackComment: r.feedbackComment,
  }));
}

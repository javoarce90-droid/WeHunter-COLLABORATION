import { and, eq, desc, asc, inArray, isNull, count } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  shortlists,
  shortlistCandidates,
  shortlistShares,
  shortlistFeedback,
  shortlistCandidateComments,
  applications,
  candidates,
  memberships,
  profiles,
  jobs,
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
    "db.shortlists.get",
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
    "db.shortlists.share.get",
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
  const lists = await db.rls(
    (tx) =>
      tx
        .select()
        .from(shortlists)
        .where(
          and(eq(shortlists.jobId, jobId), eq(shortlists.organizationId, organizationId)),
        )
        .orderBy(desc(shortlists.createdAt)),
    "db.shortlists.list",
  );

  if (lists.length === 0) return [];

  // Conteo de candidatos por shortlist en UNA query (antes era N+1: una por lista).
  const counts = await db.rls(
    (tx) =>
      tx
        .select({
          shortlistId: shortlistCandidates.shortlistId,
          n: count(),
        })
        .from(shortlistCandidates)
        .where(
          inArray(
            shortlistCandidates.shortlistId,
            lists.map((sl) => sl.id),
          ),
        )
        .groupBy(shortlistCandidates.shortlistId),
    "db.shortlists.list.counts",
  );

  const countByShortlist = new Map(
    counts.map((c) => [c.shortlistId, Number(c.n)]),
  );

  return lists.map((sl) => ({
    id: sl.id,
    name: sl.name,
    createdAt: sl.createdAt,
    candidateCount: countByShortlist.get(sl.id) ?? 0,
  }));
}

export type ShareRow = {
  id: string;
  shortlistId: string;
  token: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  /** Seteado solo en el share interno a un Hiring Manager (no en el link externo al Cliente). */
  sharedWithMembershipId: string | null;
  sharedWithName: string | null;
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
        sharedWithMembershipId: shortlistShares.sharedWithMembershipId,
        sharedWithName: profiles.fullName,
      })
      .from(shortlistShares)
      .leftJoin(memberships, eq(shortlistShares.sharedWithMembershipId, memberships.id))
      .leftJoin(profiles, eq(memberships.profileId, profiles.id))
      .where(
        and(
          eq(shortlistShares.shortlistId, shortlistId),
          eq(shortlistShares.organizationId, organizationId),
        ),
      )
      .orderBy(desc(shortlistShares.createdAt)),
    "db.shortlists.shares.list",
  );
}

/** Igual a `listSharesByShortlist` pero para VARIOS shortlists de una — la tab Shortlists de
 *  un job (con N shortlists) usaba esto en un `Promise.all` por-shortlist (N transacciones);
 *  acá es una sola, agrupada por `shortlistId` del lado del caller. */
export async function listSharesForShortlists(
  shortlistIds: string[],
  organizationId: string,
): Promise<ShareRow[]> {
  if (shortlistIds.length === 0) return [];
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
        sharedWithMembershipId: shortlistShares.sharedWithMembershipId,
        sharedWithName: profiles.fullName,
      })
      .from(shortlistShares)
      .leftJoin(memberships, eq(shortlistShares.sharedWithMembershipId, memberships.id))
      .leftJoin(profiles, eq(memberships.profileId, profiles.id))
      .where(
        and(
          inArray(shortlistShares.shortlistId, shortlistIds),
          eq(shortlistShares.organizationId, organizationId),
        ),
      )
      .orderBy(desc(shortlistShares.createdAt)),
    "db.shortlists.shares.by-shortlists",
  );
}

export type SharedShortlistSummary = {
  shortlistId: string;
  shortlistName: string;
  jobId: string;
  jobTitle: string;
  sharedAt: Date;
};

/** Shortlists compartidos internamente CON este Hiring Manager (vista propia, sin token) —
 *  ver `compartirConHM`. Una fila por share activo (no revocado). */
export async function listShortlistsSharedWithMembership(
  membershipId: string,
  organizationId: string,
): Promise<SharedShortlistSummary[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          shortlistId: shortlists.id,
          shortlistName: shortlists.name,
          jobId: shortlists.jobId,
          jobTitle: jobs.title,
          sharedAt: shortlistShares.createdAt,
        })
        .from(shortlistShares)
        .innerJoin(shortlists, eq(shortlistShares.shortlistId, shortlists.id))
        .innerJoin(jobs, eq(shortlists.jobId, jobs.id))
        .where(
          and(
            eq(shortlistShares.sharedWithMembershipId, membershipId),
            eq(shortlistShares.organizationId, organizationId),
            isNull(shortlistShares.revokedAt),
          ),
        )
        .orderBy(desc(shortlistShares.createdAt)),
    "db.shortlists.shared-with-membership",
  );
  return rows;
}

/** Gate del detalle de un shortlist compartido: existe y sigue activo (no revocado) para
 *  ESTE membership puntual. Trae el título de la búsqueda para la cabecera de la pantalla. */
export async function getSharedShortlistForMembership(
  shortlistId: string,
  membershipId: string,
  organizationId: string,
): Promise<{ shortlistId: string; name: string; jobId: string; jobTitle: string } | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          shortlistId: shortlists.id,
          name: shortlists.name,
          jobId: shortlists.jobId,
          jobTitle: jobs.title,
        })
        .from(shortlistShares)
        .innerJoin(shortlists, eq(shortlistShares.shortlistId, shortlists.id))
        .innerJoin(jobs, eq(shortlists.jobId, jobs.id))
        .where(
          and(
            eq(shortlistShares.shortlistId, shortlistId),
            eq(shortlistShares.sharedWithMembershipId, membershipId),
            eq(shortlistShares.organizationId, organizationId),
            isNull(shortlistShares.revokedAt),
          ),
        )
        .limit(1),
    "db.shortlists.shared-detail",
  );
  return rows[0] ?? null;
}

/** Confirma que ESTE shortlistCandidateId está en un shortlist compartido (activo) con ESTE
 *  membership — autorización de `registrarFeedbackInterno` antes de escribir. */
export async function getActiveShareForCandidate(args: {
  shortlistCandidateId: string;
  membershipId: string;
  organizationId: string;
}): Promise<{ shareId: string } | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ shareId: shortlistShares.id })
        .from(shortlistCandidates)
        .innerJoin(shortlistShares, eq(shortlistCandidates.shortlistId, shortlistShares.shortlistId))
        .where(
          and(
            eq(shortlistCandidates.id, args.shortlistCandidateId),
            eq(shortlistShares.sharedWithMembershipId, args.membershipId),
            eq(shortlistCandidates.organizationId, args.organizationId),
            isNull(shortlistShares.revokedAt),
          ),
        )
        .limit(1),
    "db.shortlists.active-share-for-candidate",
  );
  return rows[0] ?? null;
}

export type ShortlistCandidateWithFeedback = {
  shortlistCandidateId: string;
  applicationId: string;
  candidateId: string;
  fullName: string;
  email: string | null;
  stage: ApplicationStage;
  feedbackDecision: FeedbackDecision | null;
  feedbackComment: string | null;
  interviewRequestedAt: Date | null;
  interviewRequestedSlots: Date[] | null;
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
        applicationId: applications.id,
        candidateId: candidates.id,
        fullName: candidates.fullName,
        email: candidates.email,
        stage: applications.stage,
        feedbackDecision: shortlistFeedback.decision,
        feedbackComment: shortlistFeedback.comment,
        interviewRequestedAt: shortlistCandidates.interviewRequestedAt,
        interviewRequestedSlots: shortlistCandidates.interviewRequestedSlots,
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
    "db.shortlists.candidates",
  );
  return rows.map((r) => ({
    shortlistCandidateId: r.shortlistCandidateId,
    applicationId: r.applicationId,
    candidateId: r.candidateId,
    fullName: r.fullName,
    email: r.email,
    stage: r.stage as ApplicationStage,
    feedbackDecision: (r.feedbackDecision as FeedbackDecision | null) ?? null,
    feedbackComment: r.feedbackComment,
    interviewRequestedAt: r.interviewRequestedAt,
    interviewRequestedSlots: r.interviewRequestedSlots,
  }));
}

export type ShortlistCandidateWithFeedbackAndShortlist = ShortlistCandidateWithFeedback & {
  shortlistId: string;
};

/** Igual a `listShortlistCandidates` pero para VARIOS shortlists de una — mismo motivo que
 *  `listSharesForShortlists`: evita el N+1 de "una query por shortlist del job". */
export async function listShortlistCandidatesForShortlists(
  shortlistIds: string[],
  organizationId: string,
): Promise<ShortlistCandidateWithFeedbackAndShortlist[]> {
  if (shortlistIds.length === 0) return [];
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        shortlistId: shortlistCandidates.shortlistId,
        shortlistCandidateId: shortlistCandidates.id,
        applicationId: applications.id,
        candidateId: candidates.id,
        fullName: candidates.fullName,
        email: candidates.email,
        stage: applications.stage,
        feedbackDecision: shortlistFeedback.decision,
        feedbackComment: shortlistFeedback.comment,
        interviewRequestedAt: shortlistCandidates.interviewRequestedAt,
        interviewRequestedSlots: shortlistCandidates.interviewRequestedSlots,
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
          inArray(shortlistCandidates.shortlistId, shortlistIds),
          eq(shortlistCandidates.organizationId, organizationId),
        ),
      ),
    "db.shortlists.candidates.by-shortlists",
  );
  return rows.map((r) => ({
    shortlistId: r.shortlistId,
    shortlistCandidateId: r.shortlistCandidateId,
    applicationId: r.applicationId,
    candidateId: r.candidateId,
    fullName: r.fullName,
    email: r.email,
    stage: r.stage as ApplicationStage,
    feedbackDecision: (r.feedbackDecision as FeedbackDecision | null) ?? null,
    feedbackComment: r.feedbackComment,
    interviewRequestedAt: r.interviewRequestedAt,
    interviewRequestedSlots: r.interviewRequestedSlots,
  }));
}

/** Ficha completa de UN candidato del shortlist (perfil + feedback + pedido de entrevista) —
 *  alimenta el sheet de detalle unificado, tanto para el recruiter como para el Hiring
 *  Manager (después de que cada caller valide su propio acceso: org-wide para el recruiter,
 *  `getActiveShareForCandidate`/`getSharedShortlistForMembership` para el HM). */
export type ShortlistCandidateCore = {
  shortlistCandidateId: string;
  applicationId: string;
  candidateId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  summary: string | null;
  skills: string[] | null;
  cvUrl: string | null;
  stage: ApplicationStage;
  feedbackDecision: FeedbackDecision | null;
  feedbackComment: string | null;
  interviewRequestedAt: Date | null;
  interviewRequestedSlots: Date[] | null;
};

export async function getShortlistCandidateCore(
  shortlistCandidateId: string,
  organizationId: string,
): Promise<ShortlistCandidateCore | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          shortlistCandidateId: shortlistCandidates.id,
          applicationId: applications.id,
          candidateId: candidates.id,
          fullName: candidates.fullName,
          email: candidates.email,
          phone: candidates.phone,
          location: candidates.location,
          linkedinUrl: candidates.linkedinUrl,
          summary: candidates.summary,
          skills: candidates.skills,
          cvUrl: candidates.cvUrl,
          stage: applications.stage,
          feedbackDecision: shortlistFeedback.decision,
          feedbackComment: shortlistFeedback.comment,
          interviewRequestedAt: shortlistCandidates.interviewRequestedAt,
          interviewRequestedSlots: shortlistCandidates.interviewRequestedSlots,
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
            eq(shortlistCandidates.id, shortlistCandidateId),
            eq(shortlistCandidates.organizationId, organizationId),
          ),
        )
        .limit(1),
    "db.shortlists.candidate-core",
  );
  const r = rows[0];
  if (!r) return null;
  return { ...r, stage: r.stage as ApplicationStage, feedbackDecision: (r.feedbackDecision as FeedbackDecision | null) ?? null };
}

/** Existencia simple, para autorizar antes de escribir (ej. postear un comentario). */
export async function getShortlistCandidateById(
  shortlistCandidateId: string,
  organizationId: string,
): Promise<{ id: string } | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ id: shortlistCandidates.id })
        .from(shortlistCandidates)
        .where(
          and(
            eq(shortlistCandidates.id, shortlistCandidateId),
            eq(shortlistCandidates.organizationId, organizationId),
          ),
        )
        .limit(1),
    "db.shortlists.candidate.get",
  );
  return rows[0] ?? null;
}

export type ShortlistComment = {
  id: string;
  body: string;
  createdAt: Date;
  authorName: string | null;
};

/** Hilo de comentarios de Recruiting sobre un candidato — visible para quien lo revisa
 *  (Cliente por token vía `get_shared_shortlist`, HM/recruiter acá por RLS). */
export async function listCommentsByShortlistCandidate(
  shortlistCandidateId: string,
  organizationId: string,
): Promise<ShortlistComment[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({
          id: shortlistCandidateComments.id,
          body: shortlistCandidateComments.body,
          createdAt: shortlistCandidateComments.createdAt,
          authorName: profiles.fullName,
        })
        .from(shortlistCandidateComments)
        .leftJoin(memberships, eq(shortlistCandidateComments.authorMembershipId, memberships.id))
        .leftJoin(profiles, eq(memberships.profileId, profiles.id))
        .where(
          and(
            eq(shortlistCandidateComments.shortlistCandidateId, shortlistCandidateId),
            eq(shortlistCandidateComments.organizationId, organizationId),
          ),
        )
        .orderBy(asc(shortlistCandidateComments.createdAt)),
    "db.shortlists.comments.list",
  );
}

export type ShortlistCommentNotificationContext = {
  jobId: string;
  jobTitle: string;
  candidateName: string;
  /** Perfil del Hiring Manager con quien está compartido este shortlist internamente —
   *  null si solo tiene link externo al Cliente (sin cuenta, no se le puede avisar). */
  hmProfileId: string | null;
};

/** Contexto para notificar al postear un comentario o pedir entrevista: a quién avisar y
 *  con qué texto. Una sola query (join), evita N+1 por cada notificación. */
export async function getShortlistCommentNotificationContext(
  shortlistCandidateId: string,
  organizationId: string,
): Promise<ShortlistCommentNotificationContext | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          jobId: jobs.id,
          jobTitle: jobs.title,
          candidateName: candidates.fullName,
          hmProfileId: profiles.id,
        })
        .from(shortlistCandidates)
        .innerJoin(applications, eq(shortlistCandidates.applicationId, applications.id))
        .innerJoin(candidates, eq(applications.candidateId, candidates.id))
        .innerJoin(shortlists, eq(shortlistCandidates.shortlistId, shortlists.id))
        .innerJoin(jobs, eq(shortlists.jobId, jobs.id))
        .leftJoin(
          shortlistShares,
          and(
            eq(shortlistShares.shortlistId, shortlists.id),
            isNull(shortlistShares.revokedAt),
          ),
        )
        .leftJoin(memberships, eq(shortlistShares.sharedWithMembershipId, memberships.id))
        .leftJoin(profiles, eq(memberships.profileId, profiles.id))
        .where(
          and(
            eq(shortlistCandidates.id, shortlistCandidateId),
            eq(shortlistCandidates.organizationId, organizationId),
          ),
        )
        .limit(1),
    "db.shortlists.comment-notification-context",
  );
  return rows[0] ?? null;
}

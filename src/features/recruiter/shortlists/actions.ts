"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import {
  crearShortlistSchema,
  generarShareSchema,
  revocarShareSchema,
  compartirConHMSchema,
  registrarFeedbackInternoSchema,
  postearComentarioSchema,
  solicitarEntrevistaInternoSchema,
} from "./schema";
import { crearShortlist } from "./domain/crear-shortlist";
import { generarShare } from "./domain/generar-share";
import { revocarShare } from "./domain/revocar-share";
import { compartirConHM } from "./domain/compartir-con-hm";
import { registrarFeedbackInterno } from "./domain/registrar-feedback-interno";
import { postearComentario } from "./domain/postear-comentario";
import { solicitarEntrevistaInterno } from "./domain/solicitar-entrevista-interno";
import {
  createShortlistWithCandidates,
  filterValidApplications,
  createShare,
  createShareForMembership,
  revokeShare,
  generateShareToken,
  upsertShortlistFeedbackDirect,
  createShortlistCandidateComment,
  requestInterviewDirect,
} from "./data/shortlists.mutations";
import {
  getShortlistById,
  getShareById,
  getActiveShareForCandidate,
  getShortlistCandidateById,
  getShortlistCandidateCore,
  getShortlistCommentNotificationContext,
  listCommentsByShortlistCandidate,
} from "./data/shortlists.queries";
import { getJobForPipeline } from "@/features/recruiter/applications/data/applications.queries";
import { getMembershipById } from "@/features/recruiter/team/data/team.queries";
import { notifyOrg, notifyProfile } from "@/features/recruiter/notifications/data/notifications.mutations";
import { getCandidateResume } from "@/features/recruiter/candidates/data/resume.queries";
import { listScreeningAnswersByApplication } from "@/features/recruiter/screening/data/screening.queries";
import { listInterviewsByApplication } from "@/features/recruiter/interviews/data/interviews.queries";
import type { ShortlistCandidateDetailData } from "@/features/company/shortlist-review/domain/shortlist-candidate-detail";

export interface ShortlistActionState {
  error?: string;
  shareToken?: string;
}

export async function crearShortlistAction(
  _prev: ShortlistActionState,
  formData: FormData,
): Promise<ShortlistActionState> {
  const parsed = crearShortlistSchema.safeParse({
    jobId: formData.get("jobId"),
    name: formData.get("name"),
    applicationIds: formData.getAll("applicationIds"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [membership, user] = await Promise.all([getActiveMembership(), getCurrentUser()]);
  if (!membership || !user) return { error: "No autorizado." };

  const result = await crearShortlist(
    parsed.data,
    { userId: user.id, organizationId: membership.organizationId, role: membership.role },
    {
      getJobById: (jobId, organizationId) => getJobForPipeline(jobId, organizationId),
      filterValidApplications,
      createShortlistWithCandidates,
    },
  );

  if (!result.ok) return { error: result.error };

  revalidatePath(`/jobs/${parsed.data.jobId}/shortlists`);
  return {};
}

export async function generarShareAction(
  _prev: ShortlistActionState,
  formData: FormData,
): Promise<ShortlistActionState> {
  const parsed = generarShareSchema.safeParse({
    shortlistId: formData.get("shortlistId"),
    expiresInDays: formData.get("expiresInDays"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [membership, user] = await Promise.all([getActiveMembership(), getCurrentUser()]);
  if (!membership || !user) return { error: "No autorizado." };

  const result = await generarShare(
    parsed.data,
    { userId: user.id, organizationId: membership.organizationId, role: membership.role },
    {
      getShortlistById,
      generateToken: generateShareToken,
      createShare,
    },
  );

  if (!result.ok) return { error: result.error };

  const jobId = String(formData.get("jobId") ?? "");
  if (jobId) revalidatePath(`/jobs/${jobId}/shortlists`);
  return { shareToken: result.data.token };
}

export async function revocarShareAction(
  _prev: ShortlistActionState,
  formData: FormData,
): Promise<ShortlistActionState> {
  const parsed = revocarShareSchema.safeParse({
    shareId: formData.get("shareId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const result = await revocarShare(
    parsed.data,
    { userId: "", organizationId: membership.organizationId, role: membership.role },
    { getShareById, revokeShare },
  );

  if (!result.ok) return { error: result.error };

  const jobId = String(formData.get("jobId") ?? "");
  if (jobId) revalidatePath(`/jobs/${jobId}/shortlists`);
  return {};
}

/** Compartir interno con un Hiring Manager de la org (§9) — alternativa al link mágico. */
export async function compartirConHMAction(
  _prev: ShortlistActionState,
  formData: FormData,
): Promise<ShortlistActionState> {
  const parsed = compartirConHMSchema.safeParse({
    shortlistId: formData.get("shortlistId"),
    membershipId: formData.get("membershipId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [membership, user] = await Promise.all([getActiveMembership(), getCurrentUser()]);
  if (!membership || !user) return { error: "No autorizado." };

  const result = await compartirConHM(
    parsed.data,
    { userId: user.id, organizationId: membership.organizationId, role: membership.role },
    {
      getShortlistById,
      getMembership: getMembershipById,
      generateToken: generateShareToken,
      createShareForMembership,
    },
  );

  if (!result.ok) return { error: result.error };

  const jobId = String(formData.get("jobId") ?? "");
  if (jobId) revalidatePath(`/jobs/${jobId}/shortlists`);
  return {};
}

export interface FeedbackInternoState {
  error?: string;
}

/** El Hiring Manager deja feedback sobre un candidato de un shortlist compartido con él. */
export async function registrarFeedbackInternoAction(
  _prev: FeedbackInternoState,
  formData: FormData,
): Promise<FeedbackInternoState> {
  const parsed = registrarFeedbackInternoSchema.safeParse({
    shortlistCandidateId: formData.get("shortlistCandidateId"),
    decision: formData.get("decision"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const result = await registrarFeedbackInterno(
    parsed.data,
    { organizationId: membership.organizationId, role: membership.role, membershipId: membership.id },
    { getActiveShareForCandidate, submitFeedback: upsertShortlistFeedbackDirect },
  );
  if (!result.ok) return { error: result.error };

  // Mismo aviso que ya recibe el equipo cuando el Cliente externo deja feedback
  // (submit_shortlist_feedback, vía SQL) — acá el HM está autenticado, así que se notifica
  // desde la action en vez de la función definer.
  const context = await getShortlistCommentNotificationContext(
    parsed.data.shortlistCandidateId,
    membership.organizationId,
  );
  if (context) {
    await notifyOrg(membership.organizationId, {
      type: "system",
      title: `${context.candidateName} — el Hiring Manager dejó feedback (${context.jobTitle})`,
      link: `/jobs/${context.jobId}/shortlists`,
    });
  }

  const shortlistId = String(formData.get("shortlistId") ?? "");
  if (shortlistId) revalidatePath(`/shortlists/${shortlistId}`);
  return {};
}

export interface PostearComentarioState {
  error?: string;
}

/** Recruiting comenta sobre un candidato del shortlist — visible para el Cliente/HM que lo
 *  revisa. Es también el canal donde el reclutador responde al feedback que dejaron. */
export async function postearComentarioAction(
  _prev: PostearComentarioState,
  formData: FormData,
): Promise<PostearComentarioState> {
  const parsed = postearComentarioSchema.safeParse({
    shortlistCandidateId: formData.get("shortlistCandidateId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const result = await postearComentario(
    parsed.data,
    { organizationId: membership.organizationId, role: membership.role, membershipId: membership.id },
    { getShortlistCandidateById, createComment: createShortlistCandidateComment },
  );
  if (!result.ok) return { error: result.error };

  // El Cliente externo no tiene cuenta (sigue sin push proactivo, ve la respuesta la
  // próxima vez que abre el link) — solo avisamos si hay un Hiring Manager interno.
  const context = await getShortlistCommentNotificationContext(
    parsed.data.shortlistCandidateId,
    membership.organizationId,
  );
  if (context?.hmProfileId) {
    await notifyProfile(membership.organizationId, context.hmProfileId, {
      type: "system",
      title: `Recruiting comentó sobre ${context.candidateName} (${context.jobTitle})`,
      link: `/shortlists`,
    });
  }

  const shortlistId = String(formData.get("shortlistId") ?? "");
  if (shortlistId) revalidatePath(`/jobs/${String(formData.get("jobId") ?? "")}/shortlists`);
  return {};
}

/**
 * Ficha completa de UN candidato del shortlist — perfil, CV, screening, historial de
 * entrevistas y comentarios de Recruiting. Se pide recién al abrir el sheet de detalle
 * (mismo patrón lazy que `getFichaCandidatoAction` en Postulados/Pipeline): la mayoría de
 * las filas de un shortlist nunca se abren.
 *
 * Autorización: el recruiter (`shortlists.manage`) ve cualquier candidato de su org. El HM
 * (`shortlists.feedback`) solo el de un shortlist activamente compartido con él.
 */
export async function getShortlistCandidateDetailAction(
  shortlistCandidateId: string,
): Promise<{ ok: true; data: ShortlistCandidateDetailData } | { ok: false; error: string }> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const canManage = can(membership.role, "shortlists.manage");
  const canReviewAsHm = can(membership.role, "shortlists.feedback");
  if (!canManage && !canReviewAsHm) {
    return { ok: false, error: "Tu rol no permite ver este candidato." };
  }

  if (!canManage) {
    const share = await getActiveShareForCandidate({
      shortlistCandidateId,
      membershipId: membership.id,
      organizationId: membership.organizationId,
    });
    if (!share) return { ok: false, error: "No tenés acceso a este candidato." };
  }

  const core = await getShortlistCandidateCore(shortlistCandidateId, membership.organizationId);
  if (!core) return { ok: false, error: "Candidato no encontrado." };

  const [resume, screening, interviews, comments] = await Promise.all([
    getCandidateResume(core.candidateId),
    listScreeningAnswersByApplication(core.applicationId, membership.organizationId),
    listInterviewsByApplication(core.applicationId, membership.organizationId),
    listCommentsByShortlistCandidate(shortlistCandidateId, membership.organizationId),
  ]);

  return {
    ok: true,
    data: {
      shortlistCandidateId: core.shortlistCandidateId,
      fullName: core.fullName,
      email: core.email,
      phone: core.phone,
      location: core.location,
      linkedinUrl: core.linkedinUrl,
      summary: core.summary,
      skills: core.skills ?? [],
      cvHref: core.cvUrl ? `/candidates/${core.candidateId}/cv` : null,
      stage: core.stage,
      feedbackDecision: core.feedbackDecision,
      feedbackComment: core.feedbackComment,
      interviewRequestedAt: core.interviewRequestedAt?.toISOString() ?? null,
      interviewRequestedSlots: core.interviewRequestedSlots?.map((d) => d.toISOString()) ?? null,
      experiences: resume.experiences.map((e) => ({
        id: e.id,
        company: e.company,
        position: e.position,
        startDate: e.startDate,
        endDate: e.endDate,
        description: e.description,
      })),
      education: resume.education.map((e) => ({
        id: e.id,
        institution: e.institution,
        degree: e.degree,
        fieldOfStudy: e.fieldOfStudy,
      })),
      languages: resume.languages.map((l) => ({ id: l.id, language: l.language, level: l.level })),
      screening: screening.map((s) => ({ questionId: s.questionId, label: s.questionLabel, value: s.value })),
      interviews: interviews.map((i) => ({
        id: i.id,
        scheduledAt: i.scheduledAt.toISOString(),
        mode: i.mode,
        type: i.type,
        status: i.status,
      })),
      comments: comments.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        authorName: c.authorName,
      })),
    },
  };
}

export interface SolicitarEntrevistaInternoState {
  error?: string;
}

/** El Hiring Manager pide entrevista (con hasta 3 horarios tentativos) para un candidato de
 *  un shortlist compartido con él — misma regla que el camino Cliente por token. */
export async function solicitarEntrevistaInternoAction(
  _prev: SolicitarEntrevistaInternoState,
  formData: FormData,
): Promise<SolicitarEntrevistaInternoState> {
  const parsed = solicitarEntrevistaInternoSchema.safeParse({
    shortlistCandidateId: formData.get("shortlistCandidateId"),
    slots: formData.getAll("slots"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const result = await solicitarEntrevistaInterno(
    parsed.data,
    { organizationId: membership.organizationId, role: membership.role, membershipId: membership.id },
    { getActiveShareForCandidate, requestInterview: requestInterviewDirect },
  );
  if (!result.ok) return { error: result.error };

  const context = await getShortlistCommentNotificationContext(
    parsed.data.shortlistCandidateId,
    membership.organizationId,
  );
  if (context) {
    await notifyOrg(membership.organizationId, {
      type: "system",
      title: `${context.candidateName} — el Hiring Manager solicitó una entrevista (${context.jobTitle})`,
      link: `/jobs/${context.jobId}/shortlists`,
    });
  }

  const shortlistId = String(formData.get("shortlistId") ?? "");
  if (shortlistId) revalidatePath(`/shortlists/${shortlistId}`);
  return {};
}

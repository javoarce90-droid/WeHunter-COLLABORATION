import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import {
  FEEDBACK_DECISIONS,
  type FeedbackDecision,
} from "@/features/company/shortlist-review/domain/registrar-feedback";

/**
 * Caso de uso: el Hiring Manager deja feedback sobre un candidato de un shortlist que le
 * compartieron internamente (§9 backlog) — misma regla de negocio que `registrarFeedback`
 * (camino Cliente por token), pero autoriza por sesión + membership en vez de token, porque
 * el HM ya está adentro de la app.
 */

export type RegistrarFeedbackInternoInput = {
  shortlistCandidateId: string;
  decision: string;
  comment: string;
};

export type RegistrarFeedbackInternoCtx = {
  organizationId: string;
  role: OrgRole;
  membershipId: string;
};

export type RegistrarFeedbackInternoDeps = {
  // Confirma que ESTE shortlistCandidateId pertenece a un shortlist compartido (activo, no
  // revocado) con ESTE membership — sin esto, un HM podría mandar feedback de un candidato
  // de un shortlist ajeno adivinando el id.
  getActiveShareForCandidate: (args: {
    shortlistCandidateId: string;
    membershipId: string;
    organizationId: string;
  }) => Promise<{ shareId: string } | null>;
  submitFeedback: (args: {
    organizationId: string;
    shortlistCandidateId: string;
    shareId: string;
    decision: FeedbackDecision;
    comment: string | null;
  }) => Promise<void>;
};

export async function registrarFeedbackInterno(
  input: RegistrarFeedbackInternoInput,
  ctx: RegistrarFeedbackInternoCtx,
  deps: RegistrarFeedbackInternoDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!can(ctx.role, "shortlists.feedback")) {
    return { ok: false, error: "Tu rol no permite dejar feedback de shortlists." };
  }

  if (!FEEDBACK_DECISIONS.includes(input.decision as FeedbackDecision)) {
    return { ok: false, error: "La decisión seleccionada no es válida." };
  }

  const comment = input.comment.trim();
  if (comment.length > 2000) {
    return { ok: false, error: "El comentario no puede superar los 2.000 caracteres." };
  }

  const share = await deps.getActiveShareForCandidate({
    shortlistCandidateId: input.shortlistCandidateId,
    membershipId: ctx.membershipId,
    organizationId: ctx.organizationId,
  });
  if (!share) {
    return { ok: false, error: "No tenés acceso a este candidato." };
  }

  await deps.submitFeedback({
    organizationId: ctx.organizationId,
    shortlistCandidateId: input.shortlistCandidateId,
    shareId: share.shareId,
    decision: input.decision as FeedbackDecision,
    comment: comment === "" ? null : comment,
  });

  return { ok: true };
}

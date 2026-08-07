import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import { parseInterviewSlots } from "@/features/company/shortlist-review/domain/interview-slots";

/**
 * Caso de uso: el Hiring Manager pide entrevista para un candidato de un shortlist que le
 * compartieron internamente — misma regla de negocio que `solicitarEntrevista` (camino
 * Cliente por token), pero autoriza por sesión + membership en vez de token.
 */

export type SolicitarEntrevistaInternoInput = {
  shortlistCandidateId: string;
  slots: string[];
};

export type SolicitarEntrevistaInternoCtx = {
  organizationId: string;
  role: OrgRole;
  membershipId: string;
};

export type SolicitarEntrevistaInternoDeps = {
  // Mismo chequeo que `registrarFeedbackInterno`: confirma que el candidato pertenece a un
  // shortlist compartido (activo) con ESTE membership.
  getActiveShareForCandidate: (args: {
    shortlistCandidateId: string;
    membershipId: string;
    organizationId: string;
  }) => Promise<{ shareId: string } | null>;
  requestInterview: (args: {
    organizationId: string;
    shortlistCandidateId: string;
    slots: Date[];
  }) => Promise<void>;
};

export async function solicitarEntrevistaInterno(
  input: SolicitarEntrevistaInternoInput,
  ctx: SolicitarEntrevistaInternoCtx,
  deps: SolicitarEntrevistaInternoDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!can(ctx.role, "shortlists.feedback")) {
    return { ok: false, error: "Tu rol no permite operar shortlists compartidas." };
  }

  const slots = parseInterviewSlots(input.slots);
  if (!slots.ok) return slots;

  const share = await deps.getActiveShareForCandidate({
    shortlistCandidateId: input.shortlistCandidateId,
    membershipId: ctx.membershipId,
    organizationId: ctx.organizationId,
  });
  if (!share) {
    return { ok: false, error: "No tenés acceso a este candidato." };
  }

  await deps.requestInterview({
    organizationId: ctx.organizationId,
    shortlistCandidateId: input.shortlistCandidateId,
    slots: slots.data,
  });

  return { ok: true };
}

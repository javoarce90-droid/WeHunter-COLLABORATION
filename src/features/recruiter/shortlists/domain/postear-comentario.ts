import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/**
 * Caso de uso: Recruiting deja un comentario sobre un candidato del shortlist, visible para
 * quien lo revisa (Cliente por token o Hiring Manager por sesión) — es también el canal
 * donde el reclutador responde al feedback que dejaron, mismo hilo. Autor siempre interno
 * con `shortlists.manage` (quien arma/comparte shortlists); el Cliente/HM solo LEEN este
 * hilo, su input es `shortlist_feedback`.
 */

export type PostearComentarioInput = {
  shortlistCandidateId: string;
  body: string;
};

export type PostearComentarioCtx = {
  organizationId: string;
  role: OrgRole;
  membershipId: string;
};

export type PostearComentarioDeps = {
  // Confirma que el candidato pertenece a un shortlist de esta org (mismo alcance que
  // `getShortlistById`/`filterValidApplications` — evita comentar sobre un id ajeno).
  getShortlistCandidateById: (
    shortlistCandidateId: string,
    organizationId: string,
  ) => Promise<{ id: string } | null>;
  createComment: (args: {
    organizationId: string;
    shortlistCandidateId: string;
    authorMembershipId: string;
    body: string;
  }) => Promise<void>;
};

export async function postearComentario(
  input: PostearComentarioInput,
  ctx: PostearComentarioCtx,
  deps: PostearComentarioDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!can(ctx.role, "shortlists.manage")) {
    return { ok: false, error: "Tu rol no permite comentar en shortlists." };
  }

  const body = input.body.trim();
  if (body.length === 0) {
    return { ok: false, error: "El comentario no puede estar vacío." };
  }
  if (body.length > 2000) {
    return { ok: false, error: "El comentario no puede superar los 2.000 caracteres." };
  }

  const candidate = await deps.getShortlistCandidateById(
    input.shortlistCandidateId,
    ctx.organizationId,
  );
  if (!candidate) {
    return { ok: false, error: "Candidato no encontrado." };
  }

  await deps.createComment({
    organizationId: ctx.organizationId,
    shortlistCandidateId: input.shortlistCandidateId,
    authorMembershipId: ctx.membershipId,
    body,
  });

  return { ok: true };
}

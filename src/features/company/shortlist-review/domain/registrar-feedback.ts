// Decisiones válidas que la empresa puede dejar sobre un candidato compartido.
export const FEEDBACK_DECISIONS = ["approved", "rejected", "maybe"] as const;
export type FeedbackDecision = (typeof FEEDBACK_DECISIONS)[number];

export type RegistrarFeedbackInput = {
  token: string;
  shortlistCandidateId: string;
  decision: string;
  comment: string;
};

export type RegistrarFeedbackDeps = {
  // Invoca la función SECURITY DEFINER que valida el token + pertenencia y hace el upsert.
  // Devuelve false si la función rechazó (token inválido/candidato ajeno).
  submitFeedback: (args: {
    token: string;
    shortlistCandidateId: string;
    decision: FeedbackDecision;
    comment: string | null;
  }) => Promise<boolean>;
};

export async function registrarFeedback(
  input: RegistrarFeedbackInput,
  deps: RegistrarFeedbackDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // No hay contexto de usuario: la autorización la hace la función definer vía token.
  if (!input.token) {
    return { ok: false, error: "Enlace inválido." };
  }

  if (!FEEDBACK_DECISIONS.includes(input.decision as FeedbackDecision)) {
    return { ok: false, error: "La decisión seleccionada no es válida." };
  }

  const comment = input.comment.trim();
  if (comment.length > 2000) {
    return { ok: false, error: "El comentario no puede superar los 2.000 caracteres." };
  }

  const ok = await deps.submitFeedback({
    token: input.token,
    shortlistCandidateId: input.shortlistCandidateId,
    decision: input.decision as FeedbackDecision,
    comment: comment === "" ? null : comment,
  });

  if (!ok) {
    return { ok: false, error: "No se pudo registrar el feedback. El enlace puede haber vencido." };
  }

  return { ok: true };
}

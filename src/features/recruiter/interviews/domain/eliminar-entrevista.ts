import type { InterviewRow } from "./agendar-entrevista";

// ---- Tipos del caso de uso ----

export type EliminarEntrevistaInput = {
  interviewId: string;
};

export type EliminarEntrevistaContext = {
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
};

export type EliminarEntrevistaDeps = {
  getInterviewById: (
    interviewId: string,
    organizationId: string,
  ) => Promise<InterviewRow | null>;
  deleteInterview: (interviewId: string) => Promise<void>;
};

// ---- Caso de uso ----

export async function eliminarEntrevista(
  input: EliminarEntrevistaInput,
  ctx: EliminarEntrevistaContext,
  deps: EliminarEntrevistaDeps,
): Promise<{ ok: true; data: { id: string } } | { ok: false; error: string }> {
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden eliminar entrevistas." };
  }

  const interview = await deps.getInterviewById(input.interviewId, ctx.organizationId);
  if (!interview) {
    return { ok: false, error: "Entrevista no encontrada." };
  }

  await deps.deleteInterview(input.interviewId);
  return { ok: true, data: { id: input.interviewId } };
}

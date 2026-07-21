import type { InterviewRow } from "./agendar-entrevista";
import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

// ---- Tipos del caso de uso ----

export type EliminarEntrevistaInput = {
  interviewId: string;
};

export type EliminarEntrevistaContext = {
  userId: string;
  organizationId: string;
  role: OrgRole;
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
  if (!can(ctx.role, "interviews.manage")) {
    return { ok: false, error: "Tu rol no permite eliminar entrevistas." };
  }

  const interview = await deps.getInterviewById(input.interviewId, ctx.organizationId);
  if (!interview) {
    return { ok: false, error: "Entrevista no encontrada." };
  }

  await deps.deleteInterview(input.interviewId);
  return { ok: true, data: { id: input.interviewId } };
}

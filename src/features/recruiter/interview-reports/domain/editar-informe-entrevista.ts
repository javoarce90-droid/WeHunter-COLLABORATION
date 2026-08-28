import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import { ok, err, type Result } from "@/lib/result";
import type { InterviewReportContent, InterviewReportRow, Recommendation } from "../schema";

export type EditarInformeInput = InterviewReportContent & {
  interviewId: string;
  recommendation: Recommendation;
  recommendationJustification: string;
};

export type EditarInformeDeps = {
  getReport: (interviewId: string, organizationId: string) => Promise<{ interviewId: string } | null>;
  updateReport: (
    interviewId: string,
    patch: InterviewReportContent & {
      recommendation: Recommendation;
      recommendationJustification: string;
    },
  ) => Promise<InterviewReportRow>;
};

/** Persiste la edición que el recruiter hace sobre un informe ya generado — nunca vuelve a
 *  llamar a la IA, guarda el texto tal cual lo dejó. */
export async function editarInformeEntrevista(
  input: EditarInformeInput,
  ctx: { organizationId: string; role: OrgRole },
  deps: EditarInformeDeps,
): Promise<Result<InterviewReportRow>> {
  if (!can(ctx.role, "ai.use")) {
    return err("Tu rol no permite editar el informe.");
  }

  const existing = await deps.getReport(input.interviewId, ctx.organizationId);
  if (!existing) return err("Informe no encontrado.");

  const { interviewId, ...patch } = input;
  const saved = await deps.updateReport(interviewId, patch);
  return ok(saved);
}

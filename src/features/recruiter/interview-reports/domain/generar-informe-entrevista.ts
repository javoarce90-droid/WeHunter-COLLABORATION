import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import { ok, err, type Result } from "@/lib/result";
import type { InterviewReportInput, InterviewReportResult } from "@/lib/ai";
import type { InterviewReportRow, InterviewReportContent } from "../schema";

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export type InterviewContextForReport = {
  candidateName: string;
  jobTitle: string;
  jobId: string;
  interviewerName: string;
  interviewDate: Date;
  status: string;
};

export type GenerarInformeDeps = {
  getInterviewContext: (
    interviewId: string,
    organizationId: string,
  ) => Promise<InterviewContextForReport | null>;
  generateReport: (input: InterviewReportInput) => Promise<InterviewReportResult>;
  /** Se llama después de generar el informe: la entrevista pasa a "Realizada" aunque el
   *  recruiter nunca haya tocado su estado a mano (spec del usuario 2026-08-28: el informe es
   *  la señal de que la entrevista pasó, no al revés). */
  markInterviewCompleted: (interviewId: string) => Promise<void>;
  upsertReport: (row: {
    organizationId: string;
    interviewId: string;
    content: InterviewReportContent;
    recommendation: InterviewReportResult["recommendation"];
    recommendationJustification: string;
    sourceNotes: string;
    generatedBy: string | null;
  }) => Promise<InterviewReportRow>;
};

/** true si la entrevista ya pasó y no fue cancelada — la única condición real para dejar
 *  informe (no depende de que alguien haya editado el estado a mano). Compartido con la UI
 *  (`puedeGenerarInforme`) para no duplicar el criterio. */
export function puedeGenerarInforme(
  interview: { scheduledAt: Date; status: string },
  now: Date,
): boolean {
  return interview.status !== "cancelled" && interview.scheduledAt <= now;
}

/**
 * Genera (con IA) el informe de una entrevista ya pasada, a partir de notas o una
 * transcripción manual que pega el recruiter, y lo persiste. No exige que el recruiter haya
 * marcado la entrevista como "Realizada" a mano — alcanza con que la fecha ya haya pasado y
 * no esté cancelada; generar el informe deja la entrevista en "Realizada" como efecto (spec
 * del usuario 2026-08-28: pedirle al recruiter que primero edite el estado y recién después
 * pueda dejar el informe es fricción innecesaria). Regenerar sobre una entrevista con informe
 * existente lo reemplaza (upsert) — no hay versionado en v1.
 */
export async function generarInformeEntrevista(
  input: { interviewId: string; sourceText: string },
  ctx: { organizationId: string; role: OrgRole; userId: string; now: Date },
  deps: GenerarInformeDeps,
): Promise<Result<{ report: InterviewReportRow; jobId: string }>> {
  if (!can(ctx.role, "ai.use")) {
    return err("Tu rol no permite generar informes con IA.");
  }

  const interview = await deps.getInterviewContext(input.interviewId, ctx.organizationId);
  if (!interview) return err("Entrevista no encontrada.");
  if (interview.status === "cancelled") {
    return err("No se puede generar el informe de una entrevista cancelada.");
  }
  if (interview.interviewDate > ctx.now) {
    return err("Todavía no se realizó la entrevista.");
  }

  const result = await deps.generateReport({
    candidateName: interview.candidateName,
    jobTitle: interview.jobTitle,
    interviewerName: interview.interviewerName,
    interviewDate: dateFmt.format(interview.interviewDate),
    sourceText: input.sourceText,
  });

  const { recommendation, recommendationJustification, ...content } = result;
  const saved = await deps.upsertReport({
    organizationId: ctx.organizationId,
    interviewId: input.interviewId,
    content,
    recommendation,
    recommendationJustification,
    sourceNotes: input.sourceText,
    generatedBy: ctx.userId,
  });

  if (interview.status !== "completed") {
    await deps.markInterviewCompleted(input.interviewId);
  }

  return ok({ report: saved, jobId: interview.jobId });
}

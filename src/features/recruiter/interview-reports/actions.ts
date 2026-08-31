"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { getAiProvider } from "@/lib/ai";
import { aiErrorMessage } from "@/lib/ai/errors";
import { generarInformeEntrevista } from "./domain/generar-informe-entrevista";
import { editarInformeEntrevista } from "./domain/editar-informe-entrevista";
import { generarInformeSchema, editarInformeSchema } from "./schema";
import type { InterviewReportRow, InterviewReportContext } from "./schema";
import {
  getInterviewContextForReport,
  getReportByInterviewId,
} from "./data/interview-reports.queries";
import { upsertInterviewReport, updateInterviewReport } from "./data/interview-reports.mutations";
import { markInterviewCompleted } from "@/features/recruiter/interviews/data/interviews.mutations";
import { invalidateInterviewsCache } from "@/features/recruiter/interviews/data/interviews.queries";

type ActionResult = { ok: boolean; data?: InterviewReportRow; error?: string };

function revalidarInforme(jobId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
  if (jobId) {
    revalidatePath(`/jobs/${jobId}/pipeline`);
    revalidatePath(`/jobs/${jobId}/postulados`);
  }
}

/** Trae el informe existente de una entrevista (si lo hay, para que el diálogo sepa si abrir
 *  en modo "pegar notas" o directo en "ver/editar") + el contexto "Fuente: WeHunter" —
 *  candidato/puesto/entrevistador/fecha — para la sección 1 del informe (spec del cliente). */
export async function obtenerInformeEntrevistaAction(interviewId: string): Promise<
  | { ok: true; data: { report: InterviewReportRow | null; context: InterviewReportContext | null } }
  | { ok: false; error: string }
> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const [report, context] = await Promise.all([
    getReportByInterviewId(interviewId, membership.organizationId),
    getInterviewContextForReport(interviewId, membership.organizationId),
  ]);
  return { ok: true, data: { report, context } };
}

export async function generarInformeEntrevistaAction(
  _: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = generarInformeSchema.safeParse({
    interviewId: formData.get("interviewId"),
    sourceText: formData.get("sourceText"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input inválido." };
  }

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) return { ok: false, error: "No autorizado." };

  let res;
  try {
    res = await generarInformeEntrevista(
      parsed.data,
      { organizationId: membership.organizationId, role: membership.role, userId: user.id, now: new Date() },
      {
        getInterviewContext: getInterviewContextForReport,
        generateReport: (input) => getAiProvider().interviewReport(input),
        markInterviewCompleted,
        upsertReport: upsertInterviewReport,
      },
    );
  } catch (err) {
    // AiUnavailableError: la IA falló tras reintentos. No se persistió nada — el recruiter
    // reintenta con las mismas notas.
    return { ok: false, error: aiErrorMessage(err) };
  }
  if (!res.ok) return { ok: false, error: res.error };

  invalidateInterviewsCache(res.data.jobId, membership.organizationId);
  revalidarInforme(res.data.jobId);
  return { ok: true, data: res.data.report };
}

export async function editarInformeEntrevistaAction(
  _: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = editarInformeSchema.safeParse({
    interviewId: formData.get("interviewId"),
    ubicacion: formData.get("ubicacion") ?? "",
    remuneracionPretendida: formData.get("remuneracionPretendida") ?? "",
    disponibilidad: formData.get("disponibilidad") ?? "",
    resumen: formData.get("resumen"),
    fortalezas: formData.getAll("fortalezas"),
    aspectosAValidar: formData.getAll("aspectosAValidar"),
    recommendation: formData.get("recommendation"),
    recommendationJustification: formData.get("recommendationJustification"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input inválido." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const res = await editarInformeEntrevista(
    parsed.data,
    { organizationId: membership.organizationId, role: membership.role },
    { getReport: getReportByInterviewId, updateReport: updateInterviewReport },
  );
  if (!res.ok) return { ok: false, error: res.error };

  revalidarInforme();
  return { ok: true, data: res.data };
}

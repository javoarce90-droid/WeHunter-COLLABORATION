"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/session";
import {
  agendarInterviewSchema,
  actualizarInterviewSchema,
  eliminarInterviewSchema,
} from "./schema";
import { agendarEntrevista } from "./domain/agendar-entrevista";
import { actualizarEntrevista } from "./domain/actualizar-entrevista";
import { eliminarEntrevista } from "./domain/eliminar-entrevista";
import {
  getApplicationForInterview,
  getInterviewById,
} from "./data/interviews.queries";
import {
  insertInterview,
  updateInterview,
  deleteInterview,
} from "./data/interviews.mutations";

export interface InterviewActionState {
  error?: string;
}

/** Revalida el pipeline del job indicado en el form (las entrevistas se ven ahí). */
function revalidatePipeline(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  if (jobId) revalidatePath(`/jobs/${jobId}/pipeline`);
}

export async function agendarInterviewAction(
  _prev: InterviewActionState,
  formData: FormData,
): Promise<InterviewActionState> {
  const parsed = agendarInterviewSchema.safeParse({
    applicationId: formData.get("applicationId"),
    scheduledAt: formData.get("scheduledAt"),
    mode: formData.get("mode"),
    location: formData.get("location") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const result = await agendarEntrevista(
    parsed.data,
    {
      userId: "",
      organizationId: membership.organizationId,
      role: membership.role,
    },
    {
      getApplicationById: getApplicationForInterview,
      createInterview: insertInterview,
    },
  );

  if (!result.ok) return { error: result.error };

  revalidatePipeline(formData);
  return {};
}

export async function actualizarInterviewAction(
  _prev: InterviewActionState,
  formData: FormData,
): Promise<InterviewActionState> {
  const parsed = actualizarInterviewSchema.safeParse({
    interviewId: formData.get("interviewId"),
    scheduledAt: formData.get("scheduledAt"),
    mode: formData.get("mode"),
    status: formData.get("status"),
    location: formData.get("location") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const result = await actualizarEntrevista(
    parsed.data,
    {
      userId: "",
      organizationId: membership.organizationId,
      role: membership.role,
    },
    {
      getInterviewById,
      updateInterview,
    },
  );

  if (!result.ok) return { error: result.error };

  revalidatePipeline(formData);
  return {};
}

export async function eliminarInterviewAction(
  _prev: InterviewActionState,
  formData: FormData,
): Promise<InterviewActionState> {
  const parsed = eliminarInterviewSchema.safeParse({
    interviewId: formData.get("interviewId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const result = await eliminarEntrevista(
    parsed.data,
    {
      userId: "",
      organizationId: membership.organizationId,
      role: membership.role,
    },
    {
      getInterviewById,
      deleteInterview,
    },
  );

  if (!result.ok) return { error: result.error };

  revalidatePipeline(formData);
  return {};
}

"use server";

import { revalidatePath } from "next/cache";
import { registrarFeedbackSchema, solicitarEntrevistaSchema } from "./schema";
import { registrarFeedback } from "./domain/registrar-feedback";
import { solicitarEntrevista } from "./domain/solicitar-entrevista";
import { submitFeedbackRpc, requestInterviewRpc } from "./data/shortlist-review.data";

export interface FeedbackActionState {
  error?: string;
  ok?: boolean;
}

export async function registrarFeedbackAction(
  _prev: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  const parsed = registrarFeedbackSchema.safeParse({
    token: formData.get("token"),
    shortlistCandidateId: formData.get("shortlistCandidateId"),
    decision: formData.get("decision"),
    comment: formData.get("comment") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const result = await registrarFeedback(
    {
      token: parsed.data.token,
      shortlistCandidateId: parsed.data.shortlistCandidateId,
      decision: parsed.data.decision,
      comment: parsed.data.comment ?? "",
    },
    { submitFeedback: submitFeedbackRpc },
  );

  if (!result.ok) return { error: result.error };

  revalidatePath(`/share/${parsed.data.token}`);
  return { ok: true };
}

export interface RequestInterviewActionState {
  error?: string;
  ok?: boolean;
}

export async function solicitarEntrevistaAction(
  _prev: RequestInterviewActionState,
  formData: FormData,
): Promise<RequestInterviewActionState> {
  const parsed = solicitarEntrevistaSchema.safeParse({
    token: formData.get("token"),
    shortlistCandidateId: formData.get("shortlistCandidateId"),
    slots: formData.getAll("slots"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const result = await solicitarEntrevista(parsed.data, { requestInterview: requestInterviewRpc });

  if (!result.ok) return { error: result.error };

  revalidatePath(`/share/${parsed.data.token}`);
  return { ok: true };
}

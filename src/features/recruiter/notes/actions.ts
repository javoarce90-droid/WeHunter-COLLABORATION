"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/session";
import { guardarNotaSchema } from "./schema";
import { guardarNota } from "./domain/guardar-nota";
import { getApplicationForNote } from "./data/notes.queries";
import { updateApplicationNotes } from "./data/notes.mutations";

export interface NoteActionState {
  error?: string;
}

export async function guardarNotaAction(
  _prev: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  const parsed = guardarNotaSchema.safeParse({
    applicationId: formData.get("applicationId"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) {
    return { error: "No autorizado." };
  }

  const result = await guardarNota(
    parsed.data,
    {
      userId: "",
      organizationId: membership.organizationId,
      role: membership.role,
    },
    {
      getApplicationById: (applicationId, organizationId) =>
        getApplicationForNote(applicationId, organizationId),
      updateNotes: updateApplicationNotes,
    },
  );

  if (!result.ok) {
    return { error: result.error };
  }

  // Obtenemos el jobId del formData para revalidar el pipeline correcto
  const jobId = String(formData.get("jobId") ?? "");
  if (jobId) revalidatePath(`/jobs/${jobId}/pipeline`);

  return {};
}

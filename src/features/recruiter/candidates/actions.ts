"use server";

import { redirect } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import {
  candidateInputSchema,
  CV_ALLOWED_TYPES,
  CV_MAX_BYTES,
} from "./schema";
import { cargarCandidato } from "./domain/cargar-candidato";
import { editarCandidato } from "./domain/editar-candidato";
import {
  insertCandidate,
  updateCandidateFields,
} from "./data/candidates.mutations";
import { uploadCandidateCv } from "./data/candidates.storage";

export interface CandidateFormState {
  error?: string;
}

/** Extrae y valida el CV del FormData. Devuelve el File o null, o un mensaje de error. */
function readCvFile(
  formData: FormData,
): { file: File | null } | { error: string } {
  const raw = formData.get("cv");
  if (!(raw instanceof File) || raw.size === 0) return { file: null };
  if (!CV_ALLOWED_TYPES.includes(raw.type)) {
    return { error: "El CV debe ser PDF o Word (.doc/.docx)." };
  }
  if (raw.size > CV_MAX_BYTES) {
    return { error: "El CV supera el límite de 5 MB." };
  }
  return { file: raw };
}

export async function cargarCandidatoAction(
  _prev: CandidateFormState,
  formData: FormData,
): Promise<CandidateFormState> {
  const parsed = candidateInputSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const cv = readCvFile(formData);
  if ("error" in cv) return { error: cv.error };

  const membership = await getActiveMembership();
  const cvFile = cv.file;

  const result = await cargarCandidato(
    parsed.data,
    {
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    {
      insertCandidate,
      ...(cvFile && membership
        ? { uploadCv: () => uploadCandidateCv(membership.organizationId, cvFile) }
        : {}),
    },
  );
  if (!result.ok) {
    return { error: result.error };
  }

  redirect("/candidates");
}

export async function editarCandidatoAction(
  _prev: CandidateFormState,
  formData: FormData,
): Promise<CandidateFormState> {
  const candidateId = String(formData.get("candidateId") ?? "");
  const parsed = candidateInputSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
  });
  if (!candidateId) return { error: "Falta el candidato a editar." };
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const cv = readCvFile(formData);
  if ("error" in cv) return { error: cv.error };

  const membership = await getActiveMembership();
  const cvFile = cv.file;

  const result = await editarCandidato(
    { candidateId, ...parsed.data },
    {
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    {
      updateCandidateFields,
      ...(cvFile && membership
        ? { uploadCv: () => uploadCandidateCv(membership.organizationId, cvFile) }
        : {}),
    },
  );
  if (!result.ok) {
    return { error: result.error };
  }

  redirect("/candidates");
}

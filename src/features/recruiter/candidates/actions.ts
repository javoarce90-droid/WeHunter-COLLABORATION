"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/session";
import {
  candidateInputSchema,
  CV_ALLOWED_TYPES,
  CV_MAX_BYTES,
} from "./schema";
import { cargarCandidato } from "./domain/cargar-candidato";
import { editarCandidato } from "./domain/editar-candidato";
import {
  cambiarEstadoTalento,
  TALENT_STATES,
  type TalentState,
} from "./domain/cambiar-estado-talento";
import {
  insertCandidate,
  updateCandidateFields,
  setTalentState,
} from "./data/candidates.mutations";
import { getCandidateById } from "./data/candidates.queries";
import {
  uploadCandidateCv,
  deleteCandidateCv,
} from "./data/candidates.storage";

export interface CandidateFormState {
  error?: string;
}

export async function cambiarEstadoTalentoAction(
  candidateId: string,
  talentState: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!TALENT_STATES.includes(talentState as TalentState)) {
    return { ok: false, error: "Estado inválido." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const result = await cambiarEstadoTalento(
    { candidateId, talentState: talentState as TalentState },
    { organizationId: membership.organizationId, role: membership.role },
    { getCandidate: getCandidateById, setState: setTalentState },
  );

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/candidates");
  return { ok: true };
}

/** Lee del FormData los campos del candidato (núcleo + enriquecidos) para validar con Zod. */
function parseCandidateForm(formData: FormData) {
  return candidateInputSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    headline: formData.get("headline"),
    location: formData.get("location"),
    linkedinUrl: formData.get("linkedinUrl"),
    summary: formData.get("summary"),
    skills: formData.get("skills"),
    source: formData.get("source"),
  });
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
  const parsed = parseCandidateForm(formData);
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
        ? {
            uploadCv: () => uploadCandidateCv(membership.organizationId, cvFile),
            deleteCv: deleteCandidateCv,
          }
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
  const parsed = parseCandidateForm(formData);
  if (!candidateId) return { error: "Falta el candidato a editar." };
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const cv = readCvFile(formData);
  if ("error" in cv) return { error: cv.error };

  const membership = await getActiveMembership();
  const cvFile = cv.file;

  // Si se reemplaza el CV, necesitamos el path actual (autoritativo del server, no del
  // cliente) para borrarlo tras el reemplazo. Una sola lectura, solo cuando hay CV nuevo.
  let currentCvUrl: string | null = null;
  if (cvFile && membership) {
    const existing = await getCandidateById(candidateId, membership.organizationId);
    currentCvUrl = existing?.cvUrl ?? null;
  }

  const result = await editarCandidato(
    { candidateId, ...parsed.data, currentCvUrl },
    {
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    {
      updateCandidateFields,
      ...(cvFile && membership
        ? {
            uploadCv: () => uploadCandidateCv(membership.organizationId, cvFile),
            deleteCv: deleteCandidateCv,
          }
        : {}),
    },
  );
  if (!result.ok) {
    return { error: result.error };
  }

  redirect("/candidates");
}

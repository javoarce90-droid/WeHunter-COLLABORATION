"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/session";
import {
  candidateInputSchema,
  candidateCreateInputSchema,
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
  verificarCandidatoPorEmail,
  type VerificarCandidatoPorEmailResult,
} from "./domain/verificar-candidato-por-email";
import { agregarEtiqueta } from "./domain/agregar-etiqueta";
import { quitarEtiqueta } from "./domain/quitar-etiqueta";
import type { DuplicateCandidateMatch } from "./domain/duplicate-keys";
import {
  insertCandidate,
  updateCandidateFields,
  setTalentState,
} from "./data/candidates.mutations";
import { getCandidateById, findDuplicateCandidate } from "./data/candidates.queries";
import { findTagByName } from "./data/tags.queries";
import { insertTag, linkCandidateTag, unlinkCandidateTag } from "./data/tags.mutations";
import { findLinkableProfile } from "./data/profile-link.queries";
import {
  uploadCandidateCv,
  deleteCandidateCv,
} from "./data/candidates.storage";
import {
  insertExperience,
  insertEducation,
  insertCertification,
  insertLanguage,
} from "@/features/candidate/profile/data/resume.mutations";

export interface CandidateFormState {
  error?: string;
  duplicate?: DuplicateCandidateMatch;
  profileMatch?: true;
}

async function saveCandidateResumeItems(candidateId: string, formData: FormData) {
  const owner = { kind: "candidate" as const, candidateId };

  const experiencesRaw = formData.get("experiencesJson");
  if (typeof experiencesRaw === "string" && experiencesRaw.trim()) {
    try {
      const items = JSON.parse(experiencesRaw);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.company && item.position) {
            await insertExperience(owner, {
              company: String(item.company),
              position: String(item.position),
              startDate: item.startDate || null,
              endDate: item.endDate || null,
              description: item.description || null,
              employmentType: item.employmentType || null,
              modality: item.modality || null,
              skills: Array.isArray(item.skills) ? item.skills : null,
            });
          }
        }
      }
    } catch {}
  }

  const educationRaw = formData.get("educationJson");
  if (typeof educationRaw === "string" && educationRaw.trim()) {
    try {
      const items = JSON.parse(educationRaw);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.institution && item.degree) {
            await insertEducation(owner, {
              institution: String(item.institution),
              degree: String(item.degree),
              fieldOfStudy: item.fieldOfStudy || null,
              startDate: item.startDate || null,
              endDate: item.endDate || null,
              description: item.description || null,
              grade: item.grade || null,
              activities: item.activities || null,
            });
          }
        }
      }
    } catch {}
  }

  const certsRaw = formData.get("certificationsJson");
  if (typeof certsRaw === "string" && certsRaw.trim()) {
    try {
      const items = JSON.parse(certsRaw);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.name) {
            await insertCertification(owner, {
              name: String(item.name),
              url: item.url || null,
            });
          }
        }
      }
    } catch {}
  }

  const languagesRaw = formData.get("languagesJson");
  if (typeof languagesRaw === "string" && languagesRaw.trim()) {
    try {
      const items = JSON.parse(languagesRaw);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.language && item.level) {
            await insertLanguage(owner, {
              language: String(item.language),
              level: String(item.level),
            });
          }
        }
      }
    } catch {}
  }
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

export async function agregarEtiquetaAction(input: {
  candidateId: string;
  tagName: string;
  /** Solo para revalidar la vista desde donde se abrió el diálogo (pipeline/postulados). */
  jobId?: string;
}): Promise<{ ok: boolean; error?: string; tagId?: string; name?: string }> {
  const membership = await getActiveMembership();
  const result = await agregarEtiqueta(
    { candidateId: input.candidateId, tagName: input.tagName },
    { organizationId: membership?.organizationId ?? null, role: membership?.role ?? null },
    { getCandidateById, findTagByName, insertTag, linkCandidateTag },
  );
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/candidates");
  if (input.jobId) {
    revalidatePath(`/jobs/${input.jobId}/pipeline`);
    revalidatePath(`/jobs/${input.jobId}/postulados`);
  }
  return { ok: true, tagId: result.data.tagId, name: result.data.name };
}

export async function quitarEtiquetaAction(input: {
  candidateId: string;
  tagId: string;
  jobId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const membership = await getActiveMembership();
  const result = await quitarEtiqueta(
    { candidateId: input.candidateId, tagId: input.tagId },
    { organizationId: membership?.organizationId ?? null, role: membership?.role ?? null },
    { getCandidateById, unlinkCandidateTag },
  );
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/candidates");
  if (input.jobId) {
    revalidatePath(`/jobs/${input.jobId}/pipeline`);
    revalidatePath(`/jobs/${input.jobId}/postulados`);
  }
  return { ok: true };
}

/**
 * Chequeo en vivo (blur del campo email, antes de completar el resto del form): adelanta el
 * mismo aviso de duplicado/cuenta vinculable que `cargarCandidato` haría recién al enviar.
 * Es solo lectura — el chequeo autoritativo sigue en el dominio al crear de verdad.
 */
export async function verificarEmailCandidatoAction(
  email: string,
): Promise<VerificarCandidatoPorEmailResult> {
  const membership = await getActiveMembership();
  return verificarCandidatoPorEmail(
    email,
    {
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    { findDuplicateCandidate, findLinkableProfile },
  );
}

/** Campos del candidato (núcleo + enriquecidos) crudos del FormData, sin validar todavía. */
function candidateFormFields(formData: FormData) {
  return {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    headline: formData.get("headline"),
    phone: formData.get("phone"),
    location: formData.get("location"),
    linkedinUrl: formData.get("linkedinUrl"),
    summary: formData.get("summary"),
    skills: formData.get("skills"),
    source: formData.get("source"),
  };
}

/** Al editar, el email sigue opcional (no bloquear datos viejos sin email). */
function parseCandidateForm(formData: FormData) {
  return candidateInputSchema.safeParse(candidateFormFields(formData));
}

/** Al cargar un candidato nuevo, el email es obligatorio (ver schema.ts). */
function parseCreateCandidateForm(formData: FormData) {
  return candidateCreateInputSchema.safeParse(candidateFormFields(formData));
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
  const parsed = parseCreateCandidateForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const cv = readCvFile(formData);
  if ("error" in cv) return { error: cv.error };

  const membership = await getActiveMembership();
  const cvFile = cv.file;
  const confirmDuplicate = formData.get("confirmDuplicate") === "true";
  const linkProfile = formData.get("linkProfile") === "true";
  const skipProfileLink = formData.get("skipProfileLink") === "true";

  const result = await cargarCandidato(
    { ...parsed.data, confirmDuplicate, linkProfile, skipProfileLink },
    {
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    {
      findDuplicateCandidate,
      findLinkableProfile,
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
    return { error: result.error, duplicate: result.duplicate, profileMatch: result.profileMatch };
  }

  await saveCandidateResumeItems(result.data.candidateId, formData);

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

  await saveCandidateResumeItems(candidateId, formData);

  redirect("/candidates");
}

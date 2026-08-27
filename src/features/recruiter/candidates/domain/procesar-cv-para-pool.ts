import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import type { DraftCandidateProfile } from "@/lib/ai";
import { draftACurriculum } from "./draft-a-curriculum";
import type { CandidateResumeItems } from "../data/candidate-resume.mutations";
import type { CargarCandidatoInput, CargarCandidatoResult } from "./cargar-candidato";

/**
 * Caso de uso: crear UN candidato en el pool a partir de un CV, con IA y sin revisión manual.
 * Es la unidad del alta por lote — el cliente lo llama una vez por CV (con concurrencia
 * limitada) para poder mostrar progreso por archivo. Un CV que falla —ilegible, sin email,
 * sin nombre, duplicado— devuelve un resultado explícito, nunca tira.
 *
 * Autorización primaria: rol `candidates.manage`.
 */

export type CvSource =
  | { cvFile: { base64: string; mimeType: "application/pdf" } }
  | { cvText: string };

/** El CV listo para la IA + su path en Storage (subido por la action junto con la extracción,
 *  para que el candidato creado quede con el archivo adjunto). `cvUrl` null = no se pudo subir. */
export type ExtractedCv = { cv: CvSource; cvUrl: string | null };

export interface ProcesarCvParaPoolCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

export interface ProcesarCvParaPoolDeps {
  draftProfile: (src: CvSource) => Promise<DraftCandidateProfile>;
  /** El caso de uso `cargarCandidato` ya ligado a ctx + deps reales (en la action). */
  cargarCandidato: (input: CargarCandidatoInput) => Promise<CargarCandidatoResult>;
  persistResume: (candidateId: string, items: CandidateResumeItems) => Promise<void>;
}

export type CvParaPoolOutcome =
  | { status: "created"; candidateId: string; candidateName: string }
  | { status: "skipped_duplicate"; candidateId: string; candidateName: string }
  | { status: "failed"; reason: string; quotaExhausted?: boolean };

export async function procesarCvParaPool(
  extracted: ExtractedCv | { error: string },
  ctx: ProcesarCvParaPoolCtx,
  deps: ProcesarCvParaPoolDeps,
): Promise<CvParaPoolOutcome> {
  if (!ctx.organizationId || !ctx.role) {
    return { status: "failed", reason: "Sesión no válida." };
  }
  if (!can(ctx.role, "candidates.manage")) {
    return { status: "failed", reason: "Sin permisos para cargar candidatos." };
  }
  if ("error" in extracted) {
    return { status: "failed", reason: extracted.error };
  }

  let draft: DraftCandidateProfile;
  try {
    draft = await deps.draftProfile(extracted.cv);
  } catch {
    return { status: "failed", reason: "La IA no pudo procesar este CV." };
  }
  if (draft.extractionFailed) {
    return draft.failureReason === "quota"
      ? { status: "failed", reason: "Cuota de IA agotada — probá más tarde.", quotaExhausted: true }
      : { status: "failed", reason: "No se pudo extraer el perfil del CV." };
  }

  const email = draft.email?.trim().toLowerCase() || null;
  if (!email) {
    return { status: "failed", reason: "El CV no tiene un email de contacto." };
  }
  const fullName = draft.fullName?.trim() || null;
  if (!fullName) {
    return { status: "failed", reason: "No se pudo identificar el nombre en el CV." };
  }

  const result = await deps.cargarCandidato({
    fullName,
    email,
    headline: draft.headline || null,
    location: draft.location,
    linkedinUrl: draft.linkedinUrl,
    summary: draft.summary || null,
    skills: draft.skills.length > 0 ? draft.skills : null,
    phone: draft.phone,
    existingCvUrl: extracted.cvUrl,
    // Lote sin revisión: no auto-vinculamos a cuentas de WeHunter por email (esa decisión es
    // del recruiter). El chequeo de duplicado dentro de la misma org SÍ corre.
    skipProfileLink: true,
  });

  if (!result.ok) {
    if (result.duplicate) {
      return {
        status: "skipped_duplicate",
        candidateId: result.duplicate.id,
        candidateName: result.duplicate.fullName,
      };
    }
    return { status: "failed", reason: result.error };
  }

  try {
    await deps.persistResume(result.data.candidateId, draftACurriculum(draft));
  } catch {
    // El candidato ya se creó; el currículum se puede completar después. No es un fallo total.
  }
  return { status: "created", candidateId: result.data.candidateId, candidateName: fullName };
}

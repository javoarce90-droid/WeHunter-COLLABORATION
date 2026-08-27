import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import type { DraftCandidateProfile } from "@/lib/ai";
import { draftACurriculum } from "./draft-a-curriculum";
import type { CandidateResumeItems } from "../data/candidate-resume.mutations";
import type { CargarCandidatoInput, CargarCandidatoResult } from "./cargar-candidato";

/**
 * Caso de uso: crear varios candidatos a partir de una tanda de CVs, con IA y SIN revisión
 * individual (decisión de producto: el lote prioriza volumen sobre control fino). Un CV que
 * falla —ilegible, sin email, duplicado— se saltea y se reporta; nunca corta el resto.
 *
 * Autorización primaria: rol `candidates.manage`. El tope de archivos y la validación de tipo
 * las hace la action antes de llamar acá.
 */

export type CvSource =
  | { cvFile: { base64: string; mimeType: "application/pdf" } }
  | { cvText: string };

export interface CrearCandidatosDesdeCvsInput {
  /** `id` es opaco (la action mapea id → File real); `fileName` es para el reporte. */
  files: { id: string; fileName: string }[];
}

export interface CrearCandidatosDesdeCvsCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

/** El CV listo para la IA + su path en Storage (subido por la action junto con la extracción,
 *  para que el candidato creado quede con el archivo adjunto). `cvUrl` null = no se pudo subir. */
export type ExtractedCv = { cv: CvSource; cvUrl: string | null };

export interface CrearCandidatosDesdeCvsDeps {
  /** Extrae y sube el CV del archivo (por `id`), o devuelve un error legible. */
  extractCv: (id: string) => Promise<ExtractedCv | { error: string }>;
  draftProfile: (src: CvSource) => Promise<DraftCandidateProfile>;
  /** El caso de uso `cargarCandidato` ya ligado a ctx + deps reales (en la action). */
  cargarCandidato: (input: CargarCandidatoInput) => Promise<CargarCandidatoResult>;
  persistResume: (candidateId: string, items: CandidateResumeItems) => Promise<void>;
  /** Cuántos CVs procesar en paralelo (rate limit de Gemini + tiempo de request). */
  concurrency?: number;
}

export interface CvBatchFailure {
  fileName: string;
  reason: string;
}

export interface CrearCandidatosDesdeCvsResult {
  created: number;
  skippedDuplicate: number;
  failed: CvBatchFailure[];
}

async function procesarUno(
  id: string,
  deps: CrearCandidatosDesdeCvsDeps,
): Promise<"created" | "skipped_duplicate" | { failed: string }> {
  let extracted: ExtractedCv | { error: string };
  try {
    extracted = await deps.extractCv(id);
  } catch {
    return { failed: "No se pudo leer el archivo." };
  }
  if ("error" in extracted) return { failed: extracted.error };

  let draft: DraftCandidateProfile;
  try {
    draft = await deps.draftProfile(extracted.cv);
  } catch {
    return { failed: "La IA no pudo procesar este CV." };
  }
  if (draft.extractionFailed) {
    return { failed: "No se pudo extraer el perfil del CV." };
  }

  const email = draft.email?.trim().toLowerCase() || null;
  if (!email) {
    return { failed: "El CV no tiene un email de contacto." };
  }
  const fullName = draft.fullName?.trim() || null;
  if (!fullName) {
    return { failed: "No se pudo identificar el nombre en el CV." };
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
    if (result.duplicate) return "skipped_duplicate";
    return { failed: result.error };
  }

  try {
    await deps.persistResume(result.data.candidateId, draftACurriculum(draft));
  } catch {
    // El candidato ya se creó; el currículum se puede completar después. No lo contamos como
    // fallo total.
  }
  return "created";
}

export async function crearCandidatosDesdeCvs(
  input: CrearCandidatosDesdeCvsInput,
  ctx: CrearCandidatosDesdeCvsCtx,
  deps: CrearCandidatosDesdeCvsDeps,
): Promise<{ ok: true; data: CrearCandidatosDesdeCvsResult } | { ok: false; error: string }> {
  if (!ctx.organizationId || !ctx.role) {
    return { ok: false, error: "Necesitás estar autenticado en un workspace." };
  }
  if (!can(ctx.role, "candidates.manage")) {
    return { ok: false, error: "No tenés permisos para cargar candidatos." };
  }
  if (input.files.length === 0) {
    return { ok: false, error: "Subí al menos un CV." };
  }

  const result: CrearCandidatosDesdeCvsResult = {
    created: 0,
    skippedDuplicate: 0,
    failed: [],
  };

  const concurrency = Math.max(1, deps.concurrency ?? 3);
  const queue = [...input.files];

  async function worker() {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      const outcome = await procesarUno(next.id, deps);
      if (outcome === "created") result.created += 1;
      else if (outcome === "skipped_duplicate") result.skippedDuplicate += 1;
      else result.failed.push({ fileName: next.fileName, reason: outcome.failed });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()),
  );

  return { ok: true, data: result };
}

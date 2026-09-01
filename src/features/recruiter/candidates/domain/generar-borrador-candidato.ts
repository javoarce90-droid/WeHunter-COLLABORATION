import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import { ok, err, type Result } from "@/lib/result";
import type { DraftCandidateProfile } from "@/lib/ai";

/**
 * Caso de uso: generar con IA un borrador de candidato a partir de un CV (PDF o texto ya
 * extraído de un .docx). El CV es obligatorio (sin archivo no hay nada que analizar). No
 * scrapeamos LinkedIn en el flujo del recruiter — falla casi siempre y agrega ~10s a la
 * espera; si el CV trae una URL de LinkedIn, la IA la extrae igual. NO persiste nada — el
 * recruiter revisa y edita el borrador en el formulario antes de guardar (mismo criterio que
 * el onboarding del candidato, `generar-perfil-con-ia.ts`, que sí conserva LinkedIn como
 * fuente porque ahí un candidato puede no tener el PDF a mano). Autorización primaria: rol
 * `candidates.manage`.
 */

export interface GenerarBorradorCandidatoInput {
  cvFile?: { base64: string; mimeType: "application/pdf" };
  cvText?: string;
}

export interface GenerarBorradorCandidatoCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

export interface GenerarBorradorCandidatoDeps {
  draftProfile: (input: GenerarBorradorCandidatoInput) => Promise<DraftCandidateProfile>;
}

export async function generarBorradorCandidato(
  input: GenerarBorradorCandidatoInput,
  ctx: GenerarBorradorCandidatoCtx,
  deps: GenerarBorradorCandidatoDeps,
): Promise<Result<DraftCandidateProfile>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "candidates.manage")) {
    return err("No tenés permisos para cargar candidatos.");
  }
  if (!input.cvFile && !input.cvText) {
    return err("Subí el CV en PDF o .docx.");
  }

  const draft = await deps.draftProfile(input);
  return ok(draft);
}

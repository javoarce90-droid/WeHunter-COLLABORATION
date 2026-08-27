import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import { ok, err, type Result } from "@/lib/result";
import type { DraftCandidateProfile } from "@/lib/ai";

/**
 * Caso de uso: generar con IA un borrador de candidato a partir de un CV (PDF o texto ya
 * extraído de un .docx) y/o una URL de LinkedIn. NO persiste nada — el recruiter revisa y
 * edita el borrador en el formulario antes de guardar (mismo criterio que el onboarding del
 * candidato, `generar-perfil-con-ia.ts`). Autorización primaria: rol `candidates.manage`.
 */

export interface GenerarBorradorCandidatoInput {
  linkedinUrl?: string;
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
  if (!input.linkedinUrl && !input.cvFile && !input.cvText) {
    return err("Subí un CV o ingresá una URL de LinkedIn.");
  }

  const draft = await deps.draftProfile(input);
  return ok(draft);
}

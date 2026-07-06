import { ok, err, type Result } from "@/lib/result";
import type { DraftCandidateProfile } from "@/lib/ai";

/**
 * Caso de uso: generar un borrador de perfil con IA a partir de un CV en PDF y/o una URL de
 * LinkedIn. NO persiste nada — el candidato revisa/edita el borrador antes de guardar (mismo
 * criterio que generarBorradorAction del lado recruiter).
 */

export interface GenerarPerfilConIaInput {
  linkedinUrl?: string;
  cvFile?: { base64: string; mimeType: "application/pdf" };
}

export interface GenerarPerfilConIaCtx {
  userId: string | null;
}

export interface GenerarPerfilConIaDeps {
  draftProfile: (input: GenerarPerfilConIaInput) => Promise<DraftCandidateProfile>;
}

export async function generarPerfilConIa(
  input: GenerarPerfilConIaInput,
  ctx: GenerarPerfilConIaCtx,
  deps: GenerarPerfilConIaDeps,
): Promise<Result<DraftCandidateProfile>> {
  if (!ctx.userId) {
    return err("Necesitás estar autenticado.");
  }

  if (!input.linkedinUrl && !input.cvFile) {
    return err("Ingresá tu LinkedIn o subí tu CV en PDF (al menos uno de los dos).");
  }

  const draft = await deps.draftProfile(input);
  return ok(draft);
}

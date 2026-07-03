import { ok, err, type Result } from "@/lib/result";
import type { DraftCandidateProfile } from "@/lib/ai";

/**
 * Caso de uso: generar un borrador de perfil con IA a partir de texto libre (CV pegado o
 * perfil de LinkedIn). NO persiste nada — el candidato revisa/edita el borrador antes de
 * guardar (mismo criterio que generarBorradorAction del lado recruiter).
 */

export interface GenerarPerfilConIaInput {
  rawText: string;
}

export interface GenerarPerfilConIaCtx {
  userId: string | null;
}

export interface GenerarPerfilConIaDeps {
  draftProfile: (rawText: string) => Promise<DraftCandidateProfile>;
}

export async function generarPerfilConIa(
  input: GenerarPerfilConIaInput,
  ctx: GenerarPerfilConIaCtx,
  deps: GenerarPerfilConIaDeps,
): Promise<Result<DraftCandidateProfile>> {
  if (!ctx.userId) {
    return err("Necesitás estar autenticado.");
  }

  const rawText = input.rawText.trim();
  if (rawText.length < 20) {
    return err("Pegá tu CV o perfil de LinkedIn con un poco más de detalle.");
  }

  const draft = await deps.draftProfile(rawText);
  return ok(draft);
}

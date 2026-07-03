import { ok, err, type Result } from "@/lib/result";
import type { CandidateProfileFields } from "../data/profile.mutations";

/**
 * Caso de uso: actualizar el perfil del candidato. Lo usan tanto la edición posterior
 * (/c/profile) como el onboarding manual (/c/onboarding) — la diferencia entre ambos es
 * `ctx.markOnboardingComplete`, no la lógica de guardado.
 */

export interface ActualizarPerfilInput {
  fullName: string;
  headline?: string;
  location?: string;
  linkedinUrl?: string;
  summary?: string;
  /** Texto separado por comas, tal como lo manda el form (mismo criterio que JobForm). */
  skills?: string;
  cvUrl?: string;
}

export interface ActualizarPerfilCtx {
  userId: string | null;
  markOnboardingComplete?: boolean;
}

export interface ActualizarPerfilDeps {
  updateProfile: (
    userId: string,
    fields: CandidateProfileFields,
    markOnboardingComplete: boolean,
  ) => Promise<void>;
}

export async function actualizarPerfil(
  input: ActualizarPerfilInput,
  ctx: ActualizarPerfilCtx,
  deps: ActualizarPerfilDeps,
): Promise<Result<{ userId: string }>> {
  if (!ctx.userId) {
    return err("Necesitás estar autenticado para actualizar tu perfil.");
  }

  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    return err("El nombre completo es demasiado corto.");
  }

  const skills = input.skills
    ? Array.from(new Set(input.skills.split(",").map((s) => s.trim()).filter(Boolean)))
    : null;

  await deps.updateProfile(
    ctx.userId,
    {
      fullName,
      headline: input.headline?.trim() || null,
      location: input.location?.trim() || null,
      linkedinUrl: input.linkedinUrl?.trim() || null,
      bio: input.summary?.trim() || null,
      skills,
      cvUrl: input.cvUrl,
    },
    ctx.markOnboardingComplete ?? false,
  );

  return ok({ userId: ctx.userId });
}

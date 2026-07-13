import { ok, err, type Result } from "@/lib/result";
import type { CandidateProfileFields } from "../data/profile.mutations";

/**
 * Caso de uso: actualizar el perfil del candidato. Lo usan tanto la edición posterior
 * (/c/profile) como el onboarding manual (/c/onboarding) — la diferencia entre ambos es
 * `ctx.markOnboardingComplete`, no la lógica de guardado.
 *
 * `fullName` NO se acepta acá: una vez registrado, el nombre no es editable (se fija en el
 * alta/onboarding). Aunque el form lo mande, este caso de uso nunca lo persiste.
 */

export interface ActualizarPerfilInput {
  headline?: string;
  phone?: string;
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

  const skills = input.skills
    ? Array.from(new Set(input.skills.split(",").map((s) => s.trim()).filter(Boolean)))
    : null;

  await deps.updateProfile(
    ctx.userId,
    {
      headline: input.headline?.trim() || null,
      phone: input.phone?.trim() || null,
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

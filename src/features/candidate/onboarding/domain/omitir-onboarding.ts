import { ok, err, type Result } from "@/lib/result";

/**
 * Caso de uso: saltear el onboarding de candidato. No toca ningún campo del perfil, solo
 * marca candidateOnboardingCompletedAt para que el gate de /portal deje de mandar a
 * /c/onboarding. El candidato puede completar su perfil después desde /c/profile.
 */

export interface OmitirOnboardingCtx {
  userId: string | null;
}

export interface OmitirOnboardingDeps {
  markOnboardingComplete: (userId: string) => Promise<void>;
}

export async function omitirOnboarding(
  ctx: OmitirOnboardingCtx,
  deps: OmitirOnboardingDeps,
): Promise<Result<{ userId: string }>> {
  if (!ctx.userId) {
    return err("Necesitás estar autenticado.");
  }

  await deps.markOnboardingComplete(ctx.userId);
  return ok({ userId: ctx.userId });
}

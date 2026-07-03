"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAiProvider, type DraftCandidateProfile } from "@/lib/ai";
import { actualizarPerfil } from "@/features/candidate/profile/domain/actualizar-perfil";
import {
  updateCandidateProfile,
  markCandidateOnboardingComplete,
} from "@/features/candidate/profile/data/profile.mutations";
import { uploadCandidateProfileCv } from "@/features/candidate/profile/data/profile.storage";
import { candidateProfileSchema } from "@/features/candidate/profile/schema";
import { omitirOnboarding } from "./domain/omitir-onboarding";
import { generarPerfilConIa } from "./domain/generar-perfil-con-ia";

export interface OnboardingFormState {
  error?: string;
  success?: boolean;
}

export interface GenerarPerfilConIaState {
  error?: string;
  draft?: DraftCandidateProfile;
}

/** Server Action: completar el onboarding a mano (o revisando/editando el borrador de IA). */
export async function completarOnboardingAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const parsed = candidateProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    headline: formData.get("headline"),
    location: formData.get("location"),
    linkedinUrl: formData.get("linkedinUrl"),
    summary: formData.get("summary"),
    skills: formData.get("skills"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const user = await getCurrentUser();
  if (!user) return { error: "No tenés sesión activa." };

  const cvFile = formData.get("cv");
  const cvUrl =
    cvFile instanceof File && cvFile.size > 0
      ? (await uploadCandidateProfileCv(user.id, cvFile)).path
      : undefined;

  const result = await actualizarPerfil(
    { ...parsed.data, cvUrl },
    { userId: user.id, markOnboardingComplete: true },
    { updateProfile: updateCandidateProfile },
  );

  if (!result.ok) return { error: result.error };

  redirect("/portal");
}

/** Server Action: generar un borrador de perfil con IA a partir de texto pegado (CV/LinkedIn). */
export async function generarPerfilConIaAction(
  _prev: GenerarPerfilConIaState,
  formData: FormData,
): Promise<GenerarPerfilConIaState> {
  const user = await getCurrentUser();
  if (!user) return { error: "No tenés sesión activa." };

  const rawText = formData.get("rawText");
  const result = await generarPerfilConIa(
    { rawText: typeof rawText === "string" ? rawText : "" },
    { userId: user.id },
    { draftProfile: (text) => getAiProvider().draftCandidateProfile({ rawText: text }) },
  );

  if (!result.ok) return { error: result.error };
  return { draft: result.data };
}

/** Server Action: saltear el onboarding — se puede completar el perfil después. */
export async function omitirOnboardingAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/c/login");

  await omitirOnboarding({ userId: user.id }, { markOnboardingComplete: markCandidateOnboardingComplete });
  redirect("/portal");
}

"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { crearOrganizationSchema } from "./schema";
import { crearOrganization } from "./domain/crear-organization";
import { createOrganizationWithOwner } from "./data/onboarding.mutations";
import { buildDefaultStageTemplate } from "@/features/recruiter/pipeline-stages/domain/gestionar-plantilla-etapas";
import { replaceStageTemplate } from "@/features/recruiter/pipeline-stages/data/job-stage-templates.mutations";

export interface OnboardingFormState {
  error?: string;
}

/** Puerta de entrada del onboarding: valida (Zod), obtiene el usuario y llama al dominio. */
export async function crearOrganizationAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const parsed = crearOrganizationSchema.safeParse({
    name: formData.get("name"),
    workspaceType: formData.get("workspaceType"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const user = await getCurrentUser();

  const result = await crearOrganization(
    parsed.data,
    { userId: user?.id ?? null },
    { createOrganizationWithOwner },
  );

  if (!result.ok) {
    return { error: result.error };
  }

  // Semilla fija (sin presets): el recruiter puede editarla después en Configuración >
  // Etapas por defecto — esto es solo el punto de partida.
  await replaceStageTemplate(result.data.organizationId, buildDefaultStageTemplate());

  redirect("/dashboard");
}

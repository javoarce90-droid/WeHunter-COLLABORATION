"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { crearOrganizationSchema } from "./schema";
import { crearOrganization } from "./domain/crear-organization";
import { createOrganizationWithOwner } from "./data/onboarding.mutations";

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

  redirect("/dashboard");
}

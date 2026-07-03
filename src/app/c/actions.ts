"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Server actions de autenticación del candidato. Mismo Supabase Auth que el recruiter
 * ((auth)/actions.ts, no importado ni tocado): no hay "tipo de cuenta", solo una puerta de
 * entrada distinta con otro redirect post-login. Si viene de una postulación en curso
 * (Career Site), vuelve ahí; si no, cae a /portal, cuyo layout decide si hace falta pasar
 * primero por /c/onboarding (mismo patrón que /onboarding para el recruiter, pero por
 * candidateOnboardingCompletedAt en vez de membership).
 */

export interface CandidateAuthFormState {
  error?: string;
}

const credentialsSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

const registerSchema = credentialsSchema.extend({
  fullName: z.string().min(2, "Ingresá tu nombre"),
});

/** Solo permitimos redirects internos (evita open redirect). Sin redirect explícito → portal. */
function safeRedirect(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/portal";
}

export async function candidateLogin(
  _prev: CandidateAuthFormState,
  formData: FormData,
): Promise<CandidateAuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Email o contraseña incorrectos" };
  }

  redirect(safeRedirect(formData.get("redirect")));
}

export async function candidateRegister(
  _prev: CandidateAuthFormState,
  formData: FormData,
): Promise<CandidateAuthFormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });
  if (error) {
    return { error: error.message };
  }

  const redirectTo = safeRedirect(formData.get("redirect"));

  // Si el proyecto exige verificación de email, no hay sesión todavía.
  if (!data.session) {
    redirect(`/c/verify-email?redirect=${encodeURIComponent(redirectTo)}`);
  }

  redirect(redirectTo);
}

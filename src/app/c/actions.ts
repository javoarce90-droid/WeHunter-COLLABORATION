"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isRecruiterRoute } from "@/lib/auth/route-realms";

/**
 * Server actions de autenticación del candidato. Mismo Supabase Auth que el recruiter
 * ((auth)/actions.ts, no importado ni tocado), pero el signUp marca `account_type:
 * "candidate"` explícito (ver handle_new_user) — puerta de entrada distinta con otro
 * redirect post-login. Si viene de una postulación en curso (Career Site), vuelve ahí; si
 * no, cae a /portal, cuyo layout decide si hace falta pasar primero por /c/onboarding
 * (mismo patrón que /onboarding para el recruiter, pero por candidateOnboardingCompletedAt
 * en vez de membership).
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

/**
 * Solo permitimos redirects internos (evita open redirect) que además pertenezcan al reino
 * del candidato — nunca termina redirigido a /dashboard ni al resto del recruiter aunque el
 * query param lo pida. Sin redirect explícito (o si el destino es del otro reino) → portal.
 */
function safeRedirect(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  const isInternal = value.startsWith("/") && !value.startsWith("//");
  return isInternal && !isRecruiterRoute(value) ? value : "/portal";
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
    options: { data: { full_name: parsed.data.fullName, account_type: "candidate" } },
  });
  if (error) {
    return { error: error.message };
  }

  // Supabase no devuelve error por un email ya registrado (protección anti-enumeración):
  // responde éxito sin sesión y sin crear usuario. La señal es identities vacío.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "Ese email ya tiene una cuenta. Iniciá sesión, o registrate con un email distinto." };
  }

  const redirectTo = safeRedirect(formData.get("redirect"));

  // Si el proyecto exige verificación de email, no hay sesión todavía.
  if (!data.session) {
    redirect(`/c/verify-email?redirect=${encodeURIComponent(redirectTo)}`);
  }

  redirect(redirectTo);
}

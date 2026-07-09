"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isCandidateRoute } from "@/lib/auth/route-realms";

/**
 * Server actions de autenticación. Son un caparazón fino sobre Supabase Auth:
 * validan input (Zod) y delegan en supabase.auth. No hay lógica de negocio acá.
 */

export interface AuthFormState {
  error?: string;
  message?: string;
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
 * del recruiter — un recruiter nunca termina redirigido a /portal ni /c/* aunque el query
 * param lo pida (ver fix de tipo de cuenta real: esto es lo que evitaba el bug cruzado).
 */
function safeRedirect(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  const isInternal = value.startsWith("/") && !value.startsWith("//");
  return isInternal && !isCandidateRoute(value) ? value : "/dashboard";
}

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
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

export async function register(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
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
    options: { data: { full_name: parsed.data.fullName, account_type: "recruiter" } },
  });
  if (error) {
    return { error: error.message };
  }

  // Supabase no devuelve error por un email ya registrado (protección anti-enumeración):
  // responde éxito sin sesión y sin crear usuario. La señal es identities vacío.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "Ese email ya tiene una cuenta. Iniciá sesión, o registrate con un email distinto." };
  }

  // Si el proyecto exige verificación de email, no hay sesión todavía.
  if (!data.session) {
    return {
      message:
        "Te enviamos un email para confirmar tu cuenta. Verificalo y después iniciá sesión.",
    };
  }

  // Cuenta nueva → no tiene organization aún. El onboarding la crea.
  redirect("/onboarding");
}

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

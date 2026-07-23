"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { REMEMBER_COOKIE } from "@/lib/supabase/remember";
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

  // Checkbox "Recordar mi cuenta": presente en el FormData solo si quedó tildado.
  const rememberMe = formData.get("remember") != null;
  const supabase = await createSupabaseServerClient(rememberMe);
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Email o contraseña incorrectos" };
  }

  await persistRememberMe(rememberMe);
  redirect(safeRedirect(formData.get("redirect")));
}

/**
 * Guarda la preferencia de "recordar mi cuenta" para que el proxy la respete al refrescar la
 * sesión. Con recordar → cookie persistente; sin recordar → cookie de sesión (muere al cerrar
 * el navegador, igual que las cookies de auth que setea el login en ese caso).
 */
async function persistRememberMe(rememberMe: boolean): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_COOKIE, rememberMe ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 400 } : {}),
  });
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
  (await cookies()).delete(REMEMBER_COOKIE);
  redirect("/login");
}

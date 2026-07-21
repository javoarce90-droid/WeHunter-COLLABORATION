"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Server actions del flujo "olvidé mi contraseña", compartidas por los dos reinos
 * (recruiter y candidato). Son un caparazón fino sobre Supabase Auth (mismo criterio que
 * (auth)/actions.ts): validan input y delegan en supabase.auth. El reino llega por un hidden
 * field del form y solo decide destinos de redirect, nunca abre acceso cruzado.
 */

export type AuthRealm = "recruiter" | "candidate";

export interface ForgotPasswordState {
  error?: string;
  sent?: boolean;
  email?: string;
}

export interface ResetPasswordState {
  error?: string;
}

const emailSchema = z.object({ email: z.string().email("Email inválido") });

const passwordSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden.",
    path: ["confirm"],
  });

function realmFrom(raw: FormDataEntryValue | null): AuthRealm {
  return raw === "candidate" ? "candidate" : "recruiter";
}

const RESET_PATH: Record<AuthRealm, string> = {
  recruiter: "/reset-password",
  candidate: "/c/reset-password",
};

const APP_HOME: Record<AuthRealm, string> = {
  recruiter: "/dashboard",
  candidate: "/portal",
};

/** URL absoluta de la app derivada de los headers (mismo patrón que el callback de Google Calendar). */
async function appOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "";
}

export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const realm = realmFrom(formData.get("realm"));
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email inválido" };
  }

  const redirectTo = `${await appOrigin()}/auth/callback?next=${encodeURIComponent(RESET_PATH[realm])}`;

  const supabase = await createSupabaseServerClient();
  // Ignoramos el resultado a propósito: no revelamos si el email existe (anti-enumeración) ni el
  // rate-limit de Supabase. La UI muestra siempre la misma confirmación, exista o no la cuenta.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  return { sent: true, email: parsed.data.email };
}

export async function updatePassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const realm = realmFrom(formData.get("realm"));
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  // La sesión la dejó el callback al canjear el link de recovery. Sin ella, el link venció o
  // ya se usó → hay que pedir uno nuevo.
  const user = await getCurrentUser();
  if (!user) {
    return { error: "El enlace expiró o ya se usó. Pedí uno nuevo desde 'Olvidé mi contraseña'." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: "No se pudo actualizar la contraseña. Probá de nuevo." };
  }

  redirect(APP_HOME[realm]);
}

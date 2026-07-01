"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  candidateCredentialsSchema,
  candidateRegisterSchema,
  candidateProfileSchema,
  CV_ALLOWED_TYPES,
  CV_MAX_BYTES,
  MOCK_SESSION_COOKIE,
} from "./schema";
import { actualizarPerfil } from "./domain/actualizar-perfil";

export interface AuthFormState {
  error?: string;
  message?: string;
}

export interface ProfileFormState {
  error?: string;
  success?: boolean;
}

function safeRedirect(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/portal";
}

// Cookie utilizada para simular una sesión válida en el frontend

async function setMockSession() {
  const cookieStore = await cookies();
  cookieStore.set(MOCK_SESSION_COOKIE, "mock-user-id", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 semana
  });
}

export async function clearMockSession() {
  const cookieStore = await cookies();
  cookieStore.delete(MOCK_SESSION_COOKIE);
}

export async function getMockSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(MOCK_SESSION_COOKIE)?.value ?? null;
}

const simulateNetworkDelay = () => new Promise((resolve) => setTimeout(resolve, 800));

/** Server Action: Iniciar sesión del candidato (Mock) */
export async function candidateLoginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = candidateCredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await simulateNetworkDelay();

  // Simulación: cualquier credencial válida entra
  await setMockSession();

  redirect(safeRedirect(formData.get("redirect")));
}

/** Server Action: Registrar cuenta de candidato (Mock) */
export async function candidateRegisterAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = candidateRegisterSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await simulateNetworkDelay();

  // Simulación: registramos y automáticamente le damos sesión
  await setMockSession();

  redirect("/portal");
}

/** Extrae y valida el CV del FormData */
function readCvFile(
  formData: FormData,
): { file: File | null } | { error: string } {
  const raw = formData.get("cv");
  if (!(raw instanceof File) || raw.size === 0) return { file: null };
  if (!CV_ALLOWED_TYPES.includes(raw.type)) {
    return { error: "El CV debe ser PDF o Word (.doc/.docx)." };
  }
  if (raw.size > CV_MAX_BYTES) {
    return { error: "El CV supera el límite de 5 MB." };
  }
  return { file: raw };
}

/** Server Action: Actualizar perfil de candidato (Mock) */
export async function actualizarPerfilAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = candidateProfileSchema.safeParse({
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const cv = readCvFile(formData);
  if ("error" in cv) return { error: cv.error };

  const userId = await getMockSessionUserId();
  if (!userId) {
    return { error: "No tenés sesión activa." };
  }

  await simulateNetworkDelay();

  const result = await actualizarPerfil(
    { fullName: parsed.data.fullName },
    { userId },
  );

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/c/profile");
  return { success: true };
}

/** Server Action: Cerrar sesión del candidato (Mock) */
export async function candidateLogoutAction(): Promise<void> {
  await clearMockSession();
  redirect("/c/login");
}

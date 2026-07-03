"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { candidateProfileSchema, CV_ALLOWED_TYPES, CV_MAX_BYTES } from "./schema";
import { actualizarPerfil } from "./domain/actualizar-perfil";
import { updateCandidateProfile } from "./data/profile.mutations";
import { uploadCandidateProfileCv } from "./data/profile.storage";

export interface ProfileFormState {
  error?: string;
  success?: boolean;
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

/** Server Action: Actualizar perfil de candidato. */
export async function actualizarPerfilAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
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

  const cv = readCvFile(formData);
  if ("error" in cv) return { error: cv.error };

  const user = await getCurrentUser();
  if (!user) {
    return { error: "No tenés sesión activa." };
  }

  const cvUrl = cv.file ? (await uploadCandidateProfileCv(user.id, cv.file)).path : undefined;

  const result = await actualizarPerfil(
    { ...parsed.data, cvUrl },
    { userId: user.id },
    { updateProfile: updateCandidateProfile },
  );

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/c/profile");
  return { success: true };
}

/** Server Action: cerrar sesión del candidato (Supabase real, mismo signOut que el recruiter). */
export async function candidateLogoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/c/login");
}

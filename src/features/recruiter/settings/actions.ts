"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import {
  profileInputSchema,
  workspaceInputSchema,
  passwordInputSchema,
  IMAGE_ALLOWED_TYPES,
  IMAGE_MAX_BYTES,
} from "./schema";
import { updateOwnProfile, updateOrganization } from "./data/settings.mutations";
import { uploadAvatar, uploadOrgLogo } from "./data/settings.storage";
import { editarWorkspace } from "./domain/editar-workspace";
import type { OrgRole } from "./domain/editar-workspace";

type ActionState = { error?: string; ok?: boolean };

/** Valida una imagen subida por formulario. Devuelve el File si hay uno válido, o un error. */
function readImage(value: FormDataEntryValue | null):
  | { file: File }
  | { file: null }
  | { error: string } {
  if (!(value instanceof File) || value.size === 0) return { file: null };
  if (!IMAGE_ALLOWED_TYPES.includes(value.type)) {
    return { error: "Formato de imagen no soportado (usá PNG, JPG o WEBP)." };
  }
  if (value.size > IMAGE_MAX_BYTES) {
    return { error: "La imagen supera el máximo de 2 MB." };
  }
  return { file: value };
}

// ---- Perfil ----

export async function actualizarPerfilAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = profileInputSchema.safeParse({
    fullName: formData.get("fullName"),
    jobTitle: formData.get("jobTitle"),
    phone: formData.get("phone"),
    location: formData.get("location"),
    linkedinUrl: formData.get("linkedinUrl"),
    bio: formData.get("bio"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) return { error: "No autorizado." };

  const image = readImage(formData.get("avatar"));
  if ("error" in image) return { error: image.error };

  let avatarUrl: string | undefined;
  if (image.file) {
    const { path } = await uploadAvatar(membership.organizationId, user.id, image.file);
    avatarUrl = path;
  }

  await updateOwnProfile(user.id, {
    fullName: parsed.data.fullName,
    jobTitle: parsed.data.jobTitle ?? null,
    phone: parsed.data.phone ?? null,
    location: parsed.data.location ?? null,
    linkedinUrl: parsed.data.linkedinUrl ?? null,
    bio: parsed.data.bio ?? null,
    ...(avatarUrl ? { avatarUrl } : {}),
  });

  revalidatePath("/settings");
  return { ok: true };
}

// ---- Contraseña (Supabase Auth) ----

export async function cambiarContrasenaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = passwordInputSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const user = await getCurrentUser();
  if (!user) return { error: "No autorizado." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "No se pudo actualizar la contraseña. Probá de nuevo." };

  return { ok: true };
}

// ---- Workspace ----

export async function editarWorkspaceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = workspaceInputSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const image = readImage(formData.get("logo"));
  if ("error" in image) return { error: image.error };

  let logoPath: string | null = null;
  if (image.file) {
    const { path } = await uploadOrgLogo(membership.organizationId, image.file);
    logoPath = path;
  }

  const result = await editarWorkspace(
    { name: parsed.data.name, timezone: parsed.data.timezone ?? null, logoPath },
    { organizationId: membership.organizationId, role: membership.role as OrgRole },
    { updateOrganization },
  );
  if (!result.ok) return { error: result.error };

  revalidatePath("/settings");
  return { ok: true };
}

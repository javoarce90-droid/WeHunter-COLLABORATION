"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveMembership, getCurrentUser, ACTIVE_ORG_COOKIE } from "@/lib/auth/session";
import {
  profileInputSchema,
  workspaceIdentityInputSchema,
  IMAGE_ALLOWED_TYPES,
  IMAGE_MAX_BYTES,
} from "./schema";
import { updateOwnProfile, updateOrganization, deleteOrganization } from "./data/settings.mutations";
import { getOrganization } from "./data/settings.queries";
import { uploadAvatar, uploadOrgLogo } from "./data/settings.storage";
import { editarIdentidadWorkspace } from "./domain/editar-identidad-workspace";
import { eliminarWorkspace } from "./domain/eliminar-workspace";
import type { OrgRole } from "./domain/editar-identidad-workspace";

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
    // Checkbox nativo: si no viene en el FormData es porque está destildado.
    visibleInCommunity: formData.get("visibleInCommunity") === "on",
    ...(avatarUrl ? { avatarUrl } : {}),
  });

  revalidatePath("/settings");
  return { ok: true };
}

// ---- Workspace ----

export async function editarWorkspaceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = workspaceIdentityInputSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const logoImage = readImage(formData.get("logo"));
  if ("error" in logoImage) return { error: logoImage.error };

  let logoPath: string | null = null;
  if (logoImage.file) {
    const { path } = await uploadOrgLogo(membership.organizationId, logoImage.file);
    logoPath = path;
  }

  const result = await editarIdentidadWorkspace(
    { name: parsed.data.name, logoPath },
    { organizationId: membership.organizationId, role: membership.role as OrgRole },
    { updateOrganization },
  );
  if (!result.ok) return { error: result.error };

  revalidatePath("/settings");
  return { ok: true };
}

// ---- Eliminar workspace ----

export async function eliminarWorkspaceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const org = await getOrganization(membership.organizationId);
  if (!org) return { error: "Workspace no encontrado." };

  const result = await eliminarWorkspace(
    { confirmName: String(formData.get("confirmName") ?? "") },
    {
      organizationId: membership.organizationId,
      organizationName: org.name,
      role: membership.role as OrgRole,
    },
    { deleteOrganization },
  );
  if (!result.ok) return { error: result.error };

  (await cookies()).delete(ACTIVE_ORG_COOKIE);
  redirect("/dashboard");
}

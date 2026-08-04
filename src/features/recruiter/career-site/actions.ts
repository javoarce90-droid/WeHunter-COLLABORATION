"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/session";
import { careerSiteInputSchema, IMAGE_ALLOWED_TYPES, IMAGE_MAX_BYTES } from "./schema";
import { editarCareerSite } from "./domain/editar-career-site";
import type { OrgRole } from "@/lib/auth/session";
import { updateOrganization } from "@/features/recruiter/settings/data/settings.mutations";
import { uploadCareerSiteCover, uploadOrgLogo } from "@/features/recruiter/settings/data/settings.storage";

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

export async function editarCareerSiteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = careerSiteInputSchema.safeParse({
    slug: formData.get("slug"),
    description: formData.get("description"),
    primaryColor: formData.get("primaryColor"),
    accentColor: formData.get("accentColor"),
    website: formData.get("website"),
    linkedinUrl: formData.get("linkedinUrl"),
    instagramUrl: formData.get("instagramUrl"),
    xUrl: formData.get("xUrl"),
    facebookUrl: formData.get("facebookUrl"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const coverImage = readImage(formData.get("cover"));
  if ("error" in coverImage) return { error: coverImage.error };
  const logoImage = readImage(formData.get("logo"));
  if ("error" in logoImage) return { error: logoImage.error };

  let coverPath: string | null = null;
  if (coverImage.file) {
    const { path } = await uploadCareerSiteCover(membership.organizationId, coverImage.file);
    coverPath = path;
  }
  let logoPath: string | null = null;
  if (logoImage.file) {
    const { path } = await uploadOrgLogo(membership.organizationId, logoImage.file);
    logoPath = path;
  }

  const { slug, linkedinUrl, instagramUrl, xUrl, facebookUrl, ...rest } = parsed.data;
  const hasSocial = linkedinUrl || instagramUrl || xUrl || facebookUrl;

  const result = await editarCareerSite(
    {
      slug,
      branding: {
        ...rest,
        ...(hasSocial
          ? { social: { linkedin: linkedinUrl, instagram: instagramUrl, x: xUrl, facebook: facebookUrl } }
          : {}),
      },
      coverPath,
      logoPath,
    },
    { organizationId: membership.organizationId, role: membership.role as OrgRole },
    { updateOrganization },
  );
  if (!result.ok) return { error: result.error };

  revalidatePath("/career-site");
  revalidatePath(`/careers/${slug}`, "layout");
  return { ok: true };
}

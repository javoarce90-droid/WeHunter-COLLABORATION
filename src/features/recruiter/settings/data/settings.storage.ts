import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Acceso a imágenes de Configuración en Supabase Storage. Dos buckets PRIVADOS creados a mano
 * en el panel (como `cvs`): `avatars` (foto del recruiter) y `org-logos` (logo del workspace).
 *
 * Aislamiento por tenant: el path SIEMPRE empieza con `{organizationId}/...`, así la política
 * RLS de Storage (reutiliza `public.is_org_member((storage.foldername(name))[1]::uuid)`) acota
 * el acceso a la org del usuario. Al ser privados, las imágenes se sirven vía signed URL de vida
 * corta generada en el server (rutas /avatar y /logo).
 *
 * Buckets/políticas a crear en el panel — ver docs/SETUP.md.
 */

export const AVATARS_BUCKET = "avatars";
export const ORG_LOGOS_BUCKET = "org-logos";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora

// Extensión a partir del MIME ya validado (no del nombre del cliente): path predecible, sin
// caracteres raros ni path traversal. Si el tipo no está acá, la action lo rechaza antes.
export const IMAGE_EXT_BY_TYPE: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

async function uploadImage(
  bucket: string,
  path: string,
  file: File,
): Promise<{ path: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: true, // el avatar/logo es único por usuario/org: se reemplaza en su lugar.
  });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  return { path };
}

async function signImage(bucket: string, path: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

/** Sube el avatar del recruiter. Path: `{organizationId}/{userId}.ext` (uno por usuario). */
export function uploadAvatar(
  organizationId: string,
  userId: string,
  file: File,
): Promise<{ path: string }> {
  const ext = IMAGE_EXT_BY_TYPE[file.type] ?? "";
  return uploadImage(AVATARS_BUCKET, `${organizationId}/${userId}${ext}`, file);
}

export function getAvatarSignedUrl(path: string): Promise<string | null> {
  return signImage(AVATARS_BUCKET, path);
}

/** Sube el logo del workspace. Path: `{organizationId}/logo.ext` (uno por org). */
export function uploadOrgLogo(
  organizationId: string,
  file: File,
): Promise<{ path: string }> {
  const ext = IMAGE_EXT_BY_TYPE[file.type] ?? "";
  return uploadImage(ORG_LOGOS_BUCKET, `${organizationId}/logo${ext}`, file);
}

export function getOrgLogoSignedUrl(path: string): Promise<string | null> {
  return signImage(ORG_LOGOS_BUCKET, path);
}

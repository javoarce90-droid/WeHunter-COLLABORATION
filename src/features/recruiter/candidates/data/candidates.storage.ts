import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Acceso a los CVs en Supabase Storage. Bucket PRIVADO `cvs` (creado a mano en el panel).
 *
 * Aislamiento por tenant: el path empieza con `{organizationId}/...`. La subida y la lectura
 * usan el cliente autenticado (lleva el JWT del usuario), así que las políticas RLS de Storage
 * acotan el acceso a la org del usuario. Al ser bucket privado, los archivos solo se sirven
 * vía signed URL de vida corta, que generamos del lado del server.
 *
 * Política RLS de Storage que hay que cargar en el panel (ver PR / docs): reutiliza el helper
 * `public.is_org_member((storage.foldername(name))[1]::uuid)` ya definido en la migración 0001.
 */

const CV_BUCKET = "cvs";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora

export async function uploadCandidateCv(
  organizationId: string,
  file: File,
): Promise<{ path: string }> {
  const supabase = await createSupabaseServerClient();

  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  const path = `${organizationId}/${crypto.randomUUID()}${ext}`;

  const { error } = await supabase.storage.from(CV_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) {
    throw new Error(`No se pudo subir el CV: ${error.message}`);
  }

  return { path };
}

export async function getCvSignedUrl(path: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(CV_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

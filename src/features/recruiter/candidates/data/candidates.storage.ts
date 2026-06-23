import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CV_EXT_BY_TYPE } from "../schema";

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

  // La extensión sale del MIME ya validado (no del nombre del cliente): clave de Storage
  // predecible y sin caracteres raros / path traversal.
  const ext = CV_EXT_BY_TYPE[file.type] ?? "";
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

/** Borra un CV del bucket. Se usa para no dejar archivos huérfanos al reemplazar/limpiar. */
export async function deleteCandidateCv(path: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(CV_BUCKET).remove([path]);
  if (error) {
    throw new Error(`No se pudo borrar el CV: ${error.message}`);
  }
}

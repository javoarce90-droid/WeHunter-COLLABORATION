import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CV_EXT_BY_TYPE } from "@/features/recruiter/candidates/schema";

/**
 * Sube el CV global del candidato (perfil propio, no ligado a ninguna postulación puntual).
 * Path `profiles/{userId}/{file}` — las RLS del bucket `cvs` (migración 0022) ya permiten al
 * propio usuario autenticado insert/select/update/delete ahí, así que se usa su cliente de
 * sesión (no el service, a diferencia de apply.storage.ts: ahí el candidato no es miembro de
 * la org a la que postula, acá sí es dueño de su propio path).
 */
const CV_BUCKET = "cvs";

export async function uploadCandidateProfileCv(
  userId: string,
  file: File,
): Promise<{ path: string }> {
  const supabase = await createSupabaseServerClient();
  const ext = CV_EXT_BY_TYPE[file.type] ?? "";
  const path = `profiles/${userId}/cv-${crypto.randomUUID()}${ext}`;
  const { error } = await supabase.storage.from(CV_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: true,
  });
  if (error) {
    throw new Error(`No se pudo subir el CV: ${error.message}`);
  }
  return { path };
}

/** Borra el CV del perfil (derecho de borrado — mismo bucket/RLS que el upload de arriba). */
export async function deleteCandidateProfileCv(path: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(CV_BUCKET).remove([path]);
  if (error) {
    throw new Error(`No se pudo borrar el CV: ${error.message}`);
  }
}

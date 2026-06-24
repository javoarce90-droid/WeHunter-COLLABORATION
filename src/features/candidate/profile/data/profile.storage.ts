import { createSupabaseServerClient } from "@/lib/supabase/server";

const CV_BUCKET = "cvs";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora

const CV_EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

export async function uploadProfileCv(
  userId: string,
  file: File,
): Promise<{ path: string }> {
  const supabase = await createSupabaseServerClient();

  const ext = CV_EXT_BY_TYPE[file.type] ?? "";
  // El path para candidatos es 'profiles/{userId}/{uuid}{ext}'
  const path = `profiles/${userId}/${crypto.randomUUID()}${ext}`;

  const { error } = await supabase.storage.from(CV_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) {
    throw new Error(`No se pudo subir el CV: ${error.message}`);
  }

  return { path };
}

export async function getProfileCvSignedUrl(path: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(CV_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

export async function deleteProfileCv(path: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(CV_BUCKET).remove([path]);
  if (error) {
    throw new Error(`No se pudo borrar el CV: ${error.message}`);
  }
}

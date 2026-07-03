import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { CV_EXT_BY_TYPE } from "@/features/recruiter/candidates/schema";

/**
 * Sube el CV del candidato ANTES de llamar a apply_to_career_site_job: el candidate_id recién
 * se conoce DENTRO de esa función (find-or-create), así que no se puede armar el path final
 * `{organizationId}/{candidateId}/{file}` de antemano. Se sube a un path "pending" propio del
 * usuario y se guarda tal cual como cv_url — no hace falta renombrarlo prolijo, solo que sea
 * estable y legible por el lector de signed-URL ya existente (candidates.storage.ts).
 *
 * Cliente SERVICE (no el del usuario): el candidato no es miembro de la org a la que postula,
 * así que la policy `is_org_member(...)` del bucket `cvs` rechazaría su propia sesión. Mismo
 * criterio ya usado para firmar CVs en shortlist-review.data.ts.
 */

const CV_BUCKET = "cvs";

export async function uploadCareerSiteApplicationCv(
  organizationId: string,
  userId: string,
  file: File,
): Promise<{ path: string }> {
  const supabase = createSupabaseServiceClient();
  const ext = CV_EXT_BY_TYPE[file.type] ?? "";
  const path = `${organizationId}/pending-${userId}-${crypto.randomUUID()}${ext}`;
  const { error } = await supabase.storage.from(CV_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) {
    throw new Error(`No se pudo subir el CV: ${error.message}`);
  }
  return { path };
}

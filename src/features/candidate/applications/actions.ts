"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getCareerSiteJob } from "@/features/candidate/career-site/data/career-site.data";
import { postularInputSchema, CV_MAX_BYTES, CV_ALLOWED_TYPES } from "./schema";
import { postularDesdeCareerSite } from "./domain/postular-desde-career-site";
import { applyToJobRpc } from "./data/apply.data";
import { uploadCareerSiteApplicationCv } from "./data/apply.storage";

export interface PostularActionState {
  error?: string;
  ok?: boolean;
}

/** Valida el CV subido por formulario. Devuelve el File si es válido, o un error. */
function readCv(value: FormDataEntryValue | null): { file: File } | { error: string } {
  if (!(value instanceof File) || value.size === 0) {
    return { error: "Subí tu CV para postularte." };
  }
  if (!CV_ALLOWED_TYPES.includes(value.type)) {
    return { error: "Formato de CV no soportado (usá PDF, DOC o DOCX)." };
  }
  if (value.size > CV_MAX_BYTES) {
    return { error: "El CV supera el máximo de 5 MB." };
  }
  return { file: value };
}

export async function postularAction(
  _prev: PostularActionState,
  formData: FormData,
): Promise<PostularActionState> {
  const parsed = postularInputSchema.safeParse({
    jobId: formData.get("jobId"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    coverNote: formData.get("coverNote"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const slug = formData.get("slug");
  if (typeof slug !== "string" || !slug) {
    return { error: "Enlace inválido." };
  }

  const user = await getCurrentUser();
  if (!user) return { error: "Iniciá sesión para postularte." };

  const cv = readCv(formData.get("cv"));
  if ("error" in cv) return { error: cv.error };

  // El candidate_id recién se conoce dentro de apply_to_career_site_job — subimos el CV
  // primero, usando la org del job (ver apply.storage.ts).
  const jobPage = await getCareerSiteJob(slug, parsed.data.jobId);
  if (!jobPage) return { error: "Esta búsqueda ya no está disponible." };

  const { path: cvPath } = await uploadCareerSiteApplicationCv(
    jobPage.organization.organizationId,
    user.id,
    cv.file,
  );

  const result = await postularDesdeCareerSite(
    {
      jobId: parsed.data.jobId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      coverNote: parsed.data.coverNote,
      cvPath,
    },
    { applyToJob: applyToJobRpc },
  );
  if (!result.ok) return { error: result.error };

  revalidatePath(`/careers/${slug}/${parsed.data.jobId}`);
  return { ok: true };
}

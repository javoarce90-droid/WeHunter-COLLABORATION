"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getCandidateProfile } from "@/lib/auth/session";
import { getCareerSiteJob } from "@/features/candidate/career-site/data/career-site.data";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  postularInputSchema,
  postularAnonimoInputSchema,
  CV_MAX_BYTES,
  CV_ALLOWED_TYPES,
} from "./schema";
import { postularDesdeCareerSite } from "./domain/postular-desde-career-site";
import { applyToJobRpc, applyToJobAnonRpc } from "./data/apply.data";
import {
  uploadCareerSiteApplicationCv,
  uploadCareerSiteApplicationCvAnon,
} from "./data/apply.storage";

// Postulación anónima: máximo de envíos por IP en la ventana. Best-effort (ver rate-limit.ts).
const ANON_APPLY_LIMIT = 5;
const ANON_APPLY_WINDOW_MS = 60 * 60 * 1000;

export interface PostularActionState {
  error?: string;
  ok?: boolean;
}

/** Valida el CV subido por formulario. El CV es opcional: sin archivo no es un error. */
function readCv(value: FormDataEntryValue | null): { file: File | null } | { error: string } {
  if (!(value instanceof File) || value.size === 0) {
    return { file: null };
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
    expectedSalary: formData.get("expectedSalary"),
    expectedSalaryCurrency: formData.get("expectedSalaryCurrency"),
    screeningAnswers: formData.get("screeningAnswers"),
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

  const profile = await getCandidateProfile();
  const existingCvUrl = formData.get("existingCvUrl");
  let cvPath: string | undefined;
  if (cv.file) {
    cvPath = (
      await uploadCareerSiteApplicationCv(jobPage.organization.organizationId, user.id, cv.file)
    ).path;
  } else if (typeof existingCvUrl === "string" && existingCvUrl) {
    cvPath = existingCvUrl;
  } else if (profile?.cvUrl) {
    cvPath = profile.cvUrl;
  }

  const result = await postularDesdeCareerSite(
    {
      jobId: parsed.data.jobId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: profile?.phone ?? parsed.data.phone,
      location: profile?.location ?? undefined,
      coverNote: parsed.data.coverNote,
      cvPath,
      expectedSalary: parsed.data.expectedSalary,
      expectedSalaryCurrency: parsed.data.expectedSalaryCurrency,
      screeningAnswers: parsed.data.screeningAnswers,
    },
    { applyToJob: applyToJobRpc },
  );
  if (!result.ok) return { error: result.error };

  revalidatePath(`/careers/${slug}/${parsed.data.jobId}`);
  return { ok: true };
}

/**
 * Postulación SIN cuenta desde el Career Site público. El visitante carga sus datos
 * mínimos (nombre, email, teléfono, ubicación) + CV y queda como candidato de la org
 * (fuera del Talent Pool hasta que el recruiter lo guarde). No crea usuario: recién
 * después le ofrecemos registrarse.
 *
 * Defensa (endpoint público sin sesión): honeypot + rate-limit por IP best-effort. La
 * validación de negocio real (job abierto, career site activo, dedupe, screening) vive
 * en la función definer apply_to_career_site_job_anon.
 */
export async function postularAnonimoAction(
  _prev: PostularActionState,
  formData: FormData,
): Promise<PostularActionState> {
  // Honeypot: campo oculto que un humano nunca completa. Si viene con algo, fingimos éxito
  // (no le damos pistas al bot) y no tocamos nada.
  if (typeof formData.get("website") === "string" && formData.get("website") !== "") {
    return { ok: true };
  }

  if (!consumeRateLimit(`anon-apply:${await getClientIp()}`, ANON_APPLY_LIMIT, ANON_APPLY_WINDOW_MS)) {
    return { error: "Demasiados intentos. Esperá un rato antes de volver a postularte." };
  }

  const parsed = postularAnonimoInputSchema.safeParse({
    jobId: formData.get("jobId"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    location: formData.get("location"),
    coverNote: formData.get("coverNote"),
    expectedSalary: formData.get("expectedSalary"),
    expectedSalaryCurrency: formData.get("expectedSalaryCurrency"),
    screeningAnswers: formData.get("screeningAnswers"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const slug = formData.get("slug");
  if (typeof slug !== "string" || !slug) {
    return { error: "Enlace inválido." };
  }

  const cv = readCv(formData.get("cv"));
  if ("error" in cv) return { error: cv.error };
  if (!cv.file) return { error: "Adjuntá tu CV para postularte." };

  const jobPage = await getCareerSiteJob(slug, parsed.data.jobId);
  if (!jobPage) return { error: "Esta búsqueda ya no está disponible." };

  const { path: cvPath } = await uploadCareerSiteApplicationCvAnon(
    jobPage.organization.organizationId,
    cv.file,
  );

  const result = await postularDesdeCareerSite(
    {
      jobId: parsed.data.jobId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      location: parsed.data.location,
      coverNote: parsed.data.coverNote,
      cvPath,
      expectedSalary: parsed.data.expectedSalary,
      expectedSalaryCurrency: parsed.data.expectedSalaryCurrency,
      screeningAnswers: parsed.data.screeningAnswers,
    },
    { applyToJob: applyToJobAnonRpc },
  );
  if (!result.ok) return { error: result.error };

  revalidatePath(`/careers/${slug}/${parsed.data.jobId}`);
  return { ok: true };
}

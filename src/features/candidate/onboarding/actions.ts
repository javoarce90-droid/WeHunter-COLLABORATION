"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeUrl } from "@/lib/url";
import { getAiProvider, type DraftCandidateProfile } from "@/lib/ai";
import { candidateProfileSchema } from "@/features/candidate/profile/schema";
import { uploadCandidateProfileCv } from "@/features/candidate/profile/data/profile.storage";
import { markCandidateOnboardingComplete } from "@/features/candidate/profile/data/profile.mutations";
import { getCvSignedUrl } from "@/features/recruiter/candidates/data/candidates.storage";
import { omitirOnboarding } from "./domain/omitir-onboarding";
import { generarPerfilConIa } from "./domain/generar-perfil-con-ia";
import { completarOnboardingConIa } from "./domain/completar-onboarding-con-ia";
import { persistOnboardingDraft } from "./data/persist-onboarding-draft.mutations";
import {
  CV_MAX_BYTES,
  AI_CV_ALLOWED_TYPES,
  aiWorkExperiencesSchema,
  aiEducationEntriesSchema,
  aiCertificationsSchema,
} from "./schema";

export interface OnboardingFormState {
  error?: string;
  success?: boolean;
}

export interface GenerarPerfilConIaState {
  error?: string;
  draft?: DraftCandidateProfile;
  /** Path del CV ya subido a Storage en este paso — evita pedirlo de nuevo en el paso 2. */
  cvUrl?: string;
  cvDownloadUrl?: string | null;
}

/** Parsea un campo hidden de FormData como JSON y lo valida con el schema dado. Ausente = []. */
function parseDraftItems<T>(formData: FormData, key: string, schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }): T | { error: string } {
  const raw = formData.get(key);
  if (typeof raw !== "string" || !raw) return schema.safeParse([]).data as T;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { error: "Datos de currículum inválidos." };
  }
  const validated = schema.safeParse(json);
  if (!validated.success) return { error: "Datos de currículum inválidos." };
  return validated.data as T;
}

/** Server Action: completar el onboarding a mano (o revisando/editando el borrador de IA). */
export async function completarOnboardingAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const parsed = candidateProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    headline: formData.get("headline"),
    phone: formData.get("phone"),
    location: formData.get("location"),
    linkedinUrl: formData.get("linkedinUrl"),
    summary: formData.get("summary"),
    skills: formData.get("skills"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const user = await getCurrentUser();
  if (!user) return { error: "No tenés sesión activa." };

  const cvFile = formData.get("cv");
  const existingCvUrl = formData.get("existingCvUrl");
  const cvUrl =
    cvFile instanceof File && cvFile.size > 0
      ? (await uploadCandidateProfileCv(user.id, cvFile)).path
      : typeof existingCvUrl === "string" && existingCvUrl
        ? existingCvUrl
        : undefined;

  const workExperiences = parseDraftItems(formData, "workExperiences", aiWorkExperiencesSchema);
  if (workExperiences && "error" in workExperiences) return { error: workExperiences.error };
  const education = parseDraftItems(formData, "education", aiEducationEntriesSchema);
  if (education && "error" in education) return { error: education.error };
  const certifications = parseDraftItems(formData, "certifications", aiCertificationsSchema);
  if (certifications && "error" in certifications) return { error: certifications.error };

  const result = await completarOnboardingConIa(
    { ...parsed.data, cvUrl, workExperiences, education, certifications },
    { userId: user.id },
    { persistDraft: persistOnboardingDraft },
  );

  if (!result.ok) return { error: result.error };

  redirect("/c/profile");
}

/** Server Action: generar un borrador de perfil con IA a partir de un CV en PDF y/o LinkedIn. */
export async function generarPerfilConIaAction(
  _prev: GenerarPerfilConIaState,
  formData: FormData,
): Promise<GenerarPerfilConIaState> {
  const user = await getCurrentUser();
  if (!user) return { error: "No tenés sesión activa." };

  const linkedinUrlRaw = formData.get("linkedinUrl");
  const linkedinUrl =
    typeof linkedinUrlRaw === "string" ? normalizeUrl(linkedinUrlRaw) : "";

  const cv = formData.get("cv");
  const hasCv = cv instanceof File && cv.size > 0;

  if (!linkedinUrl && !hasCv) {
    return { error: "Ingresá tu LinkedIn o subí tu CV en PDF (al menos uno de los dos)." };
  }
  if (hasCv) {
    const file = cv as File;
    if (!AI_CV_ALLOWED_TYPES.includes(file.type)) {
      return { error: "Por ahora este asistente solo acepta CV en PDF. Convertilo a PDF e intentá de nuevo." };
    }
    if (file.size > CV_MAX_BYTES) {
      return { error: "El PDF supera los 5 MB permitidos." };
    }
  }

  const cvFile = hasCv
    ? {
        base64: Buffer.from(await (cv as File).arrayBuffer()).toString("base64"),
        mimeType: "application/pdf" as const,
      }
    : undefined;

  // Subimos el CV a Storage ACÁ (no en el paso 2): así queda persistido server-side y el paso
  // de revisión no depende de reinyectar el mismo File en memoria del cliente (bug: pedía
  // subirlo de nuevo si se recargaba la página o el navegador bloqueaba el truco de DataTransfer).
  const uploaded = hasCv ? await uploadCandidateProfileCv(user.id, cv as File) : null;

  const result = await generarPerfilConIa(
    { linkedinUrl: linkedinUrl || undefined, cvFile },
    { userId: user.id },
    { draftProfile: (input) => getAiProvider().draftCandidateProfile(input) },
  );

  if (!result.ok) return { error: result.error };
  return {
    draft: result.data,
    cvUrl: uploaded?.path,
    cvDownloadUrl: uploaded ? await getCvSignedUrl(uploaded.path) : null,
  };
}

/** Server Action: saltear el onboarding — se puede completar el perfil después. */
export async function omitirOnboardingAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/c/login");

  await omitirOnboarding({ userId: user.id }, { markOnboardingComplete: markCandidateOnboardingComplete });
  redirect("/c/profile");
}

"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { toggleInteraction } from "./data/interactions.mutations";
import { withdrawApplicationRpc } from "./data/applications.mutations";
import { retirarPostulacion } from "./domain/gestionar-postulacion";
import { postularDesdeCareerSite } from "@/features/candidate/applications/domain/postular-desde-career-site";
import { applyToJobRpc } from "@/features/candidate/applications/data/apply.data";
import { uploadCareerSiteApplicationCv } from "@/features/candidate/applications/data/apply.storage";
import { CV_MAX_BYTES, CV_ALLOWED_TYPES } from "@/features/candidate/applications/schema";

export interface PortalApplyState {
  error?: string;
  ok?: boolean;
}

export async function toggleFavoriteAction(jobId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await toggleInteraction(user.id, jobId, "favorite");
  revalidatePath("/portal");
}

export async function toggleHiddenAction(jobId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await toggleInteraction(user.id, jobId, "hidden");
  revalidatePath("/portal");
}

/** Extrae y valida el CV del FormData (mismo criterio que candidate/applications/actions.ts). */
function readCv(value: FormDataEntryValue | null): { file: File | null } | { error: string } {
  if (!(value instanceof File) || value.size === 0) return { file: null };
  if (!CV_ALLOWED_TYPES.includes(value.type)) {
    return { error: "Formato de CV no soportado (usá PDF, DOC o DOCX)." };
  }
  if (value.size > CV_MAX_BYTES) {
    return { error: "El CV supera el máximo de 5 MB." };
  }
  return { file: value };
}

export async function postularEnPortalAction(
  _prev: PortalApplyState,
  formData: FormData,
): Promise<PortalApplyState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Iniciá sesión para postularte." };

  const jobId = formData.get("jobId");
  const organizationId = formData.get("organizationId");
  const fullName = formData.get("fullName");
  const email = formData.get("email");
  if (
    typeof jobId !== "string" || !jobId ||
    typeof organizationId !== "string" || !organizationId ||
    typeof fullName !== "string" ||
    typeof email !== "string"
  ) {
    return { error: "Datos inválidos." };
  }

  const cv = readCv(formData.get("cv"));
  if ("error" in cv) return { error: cv.error };

  const existingCvUrl = formData.get("existingCvUrl");
  let cvPath: string;
  if (cv.file) {
    cvPath = (await uploadCareerSiteApplicationCv(organizationId, user.id, cv.file)).path;
  } else if (typeof existingCvUrl === "string" && existingCvUrl) {
    cvPath = existingCvUrl;
  } else {
    return { error: "Subí tu CV para postularte." };
  }

  const phone = formData.get("phone");
  const linkedinUrl = formData.get("linkedinUrl");
  const result = await postularDesdeCareerSite(
    {
      jobId,
      fullName,
      email,
      phone: typeof phone === "string" ? phone : undefined,
      coverNote: typeof linkedinUrl === "string" && linkedinUrl ? `LinkedIn: ${linkedinUrl}` : undefined,
      cvPath,
    },
    { applyToJob: applyToJobRpc },
  );

  if (!result.ok) return { error: result.error };

  revalidatePath("/portal");
  revalidatePath("/portal/mis-postulaciones");
  return { ok: true };
}

export async function retirarPostulacionAction(applicationId: string): Promise<void> {
  const user = await getCurrentUser();
  const result = await retirarPostulacion(
    applicationId,
    { userId: user?.id ?? null },
    { withdraw: withdrawApplicationRpc },
  );
  if (result.ok) {
    revalidatePath("/portal/mis-postulaciones");
  }
}

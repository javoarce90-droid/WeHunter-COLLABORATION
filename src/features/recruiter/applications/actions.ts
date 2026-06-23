"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/session";
import { postularCandidatoSchema, moverEtapaSchema } from "./schema";
import { postularCandidato } from "./domain/postular-candidato";
import { moverEtapa } from "./domain/mover-etapa";
import {
  getJobForPipeline,
  getApplicationById,
  findExistingApplication,
} from "./data/applications.queries";
import {
  insertApplication,
  updateApplicationStage,
} from "./data/applications.mutations";
import { getCandidateById } from "../candidates/data/candidates.queries";

export interface ApplicationActionState {
  error?: string;
}

export async function postularCandidatoAction(
  _prev: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const parsed = postularCandidatoSchema.safeParse({
    jobId: formData.get("jobId"),
    candidateId: formData.get("candidateId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) {
    return { error: "No autorizado." };
  }

  const result = await postularCandidato(
    parsed.data,
    {
      userId: "",
      organizationId: membership.organizationId,
      role: membership.role,
    },
    {
      getJobById: (jobId, organizationId) => getJobForPipeline(jobId, organizationId),
      getCandidateById: (candidateId, organizationId) =>
        getCandidateById(candidateId, organizationId),
      findExistingApplication: (jobId, candidateId) =>
        findExistingApplication(jobId, candidateId),
      createApplication: insertApplication,
    },
  );

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/jobs/${parsed.data.jobId}/pipeline`);
  return {};
}

export async function moverEtapaAction(
  _prev: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const parsed = moverEtapaSchema.safeParse({
    applicationId: formData.get("applicationId"),
    newStage: formData.get("newStage"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) {
    return { error: "No autorizado." };
  }

  const result = await moverEtapa(
    parsed.data,
    {
      userId: "",
      organizationId: membership.organizationId,
      role: membership.role,
    },
    {
      getApplicationById: (applicationId, organizationId) =>
        getApplicationById(applicationId, organizationId),
      updateApplicationStage,
    },
  );

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/jobs/${result.data.jobId}/pipeline`);
  return {};
}

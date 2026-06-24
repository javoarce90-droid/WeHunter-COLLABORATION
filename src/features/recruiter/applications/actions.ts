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

export interface PostularVariosResult {
  ok: boolean;
  /** Cuántos entraron al pipeline. */
  added?: number;
  /** Cuántos se saltaron (ya estaban en la búsqueda u otro motivo recuperable). */
  skipped?: number;
  error?: string;
}

/**
 * Postula varios candidatos a una búsqueda de una (acción masiva del listado). Orquesta el
 * mismo caso de uso `postularCandidato` por cada candidato (la regla de negocio vive en el
 * dominio, no acá) y revalida una sola vez. Los duplicados se cuentan como "saltados", no
 * como error: la acción masiva es tolerante.
 */
export async function postularVariosAction(
  jobId: string,
  candidateIds: string[],
): Promise<PostularVariosResult> {
  if (!jobId || candidateIds.length === 0) {
    return { ok: false, error: "Elegí una búsqueda y al menos un candidato." };
  }

  const membership = await getActiveMembership();
  if (!membership) {
    return { ok: false, error: "No autorizado." };
  }

  const ctx = {
    userId: "",
    organizationId: membership.organizationId,
    role: membership.role,
  };
  const deps = {
    getJobById: (id: string, organizationId: string) => getJobForPipeline(id, organizationId),
    getCandidateById: (id: string, organizationId: string) =>
      getCandidateById(id, organizationId),
    findExistingApplication: (jId: string, cId: string) =>
      findExistingApplication(jId, cId),
    createApplication: insertApplication,
  };

  let added = 0;
  let skipped = 0;
  let firstError: string | undefined;

  for (const candidateId of candidateIds) {
    const result = await postularCandidato({ jobId, candidateId }, ctx, deps);
    if (result.ok) added += 1;
    else {
      skipped += 1;
      firstError ??= result.error;
    }
  }

  // Nada entró y todos fallaron → propagamos el primer motivo como error.
  if (added === 0) {
    return { ok: false, error: firstError ?? "No se pudo postular a los candidatos." };
  }

  revalidatePath(`/jobs/${jobId}/pipeline`);
  return { ok: true, added, skipped };
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

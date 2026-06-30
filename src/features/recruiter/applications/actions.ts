"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/session";
import { postularCandidatoSchema, moverEtapaSchema } from "./schema";
import { postularCandidato } from "./domain/postular-candidato";
import { moverEtapa } from "./domain/mover-etapa";
import { marcarFavorito } from "./domain/marcar-favorito";
import { puntuarPostulaciones } from "./domain/puntuar-postulaciones";
import {
  getJobForPipeline,
  getApplicationById,
  findExistingApplication,
  listApplicationsForScoring,
} from "./data/applications.queries";
import {
  insertApplication,
  updateApplicationStage,
  setApplicationFavorite,
  saveApplicationScore,
} from "./data/applications.mutations";
import { getCandidateById } from "../candidates/data/candidates.queries";
import { getJobById } from "../jobs/data/jobs.queries";
import { candidateInputSchema } from "../candidates/schema";
import { cargarCandidato } from "../candidates/domain/cargar-candidato";
import { insertCandidate } from "../candidates/data/candidates.mutations";
import { getAiProvider } from "@/lib/ai";

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

/**
 * Flujo contextual: crear un candidato nuevo (carga rápida, sin CV) Y postularlo a la búsqueda
 * en un solo paso, sin salir del pipeline. Orquesta dos casos de uso existentes —cada uno con su
 * propia autorización—: `cargarCandidato` (lo deja en el pool) y `postularCandidato`. Si el alta
 * sale bien pero el postular falla, el candidato YA quedó en el pool: no se pierde el trabajo.
 */
export async function crearYPostularCandidatoAction(
  _prev: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return { error: "Falta la búsqueda." };

  const parsed = candidateInputSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    skills: formData.get("skills"),
    source: formData.get("source"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  // 1. Alta en el pool (sin CV: el enriquecimiento se hace después desde la ficha).
  const created = await cargarCandidato(
    parsed.data,
    { organizationId: membership.organizationId, role: membership.role },
    { insertCandidate },
  );
  if (!created.ok) return { error: created.error };

  // 2. Postular a la búsqueda. Mismo caso de uso (y deps) que el postular del pool.
  const postulado = await postularCandidato(
    { jobId, candidateId: created.data.candidateId },
    { userId: "", organizationId: membership.organizationId, role: membership.role },
    {
      getJobById: (id, organizationId) => getJobForPipeline(id, organizationId),
      getCandidateById: (id, organizationId) => getCandidateById(id, organizationId),
      findExistingApplication: (jId, cId) => findExistingApplication(jId, cId),
      createApplication: insertApplication,
    },
  );
  if (!postulado.ok) {
    return { error: `Candidato creado en el pool, pero no se pudo postular: ${postulado.error}` };
  }

  revalidatePath(`/jobs/${jobId}/pipeline`);
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
  revalidatePath(`/jobs/${result.data.jobId}/postulados`);
  return {};
}

const marcarFavoritoSchema = z.object({
  applicationId: z.string().uuid(),
  isFavorite: z.boolean(),
  jobId: z.string().uuid(),
});

export async function marcarFavoritoAction(
  applicationId: string,
  isFavorite: boolean,
  jobId: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = marcarFavoritoSchema.safeParse({ applicationId, isFavorite, jobId });
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const result = await marcarFavorito(
    { applicationId, isFavorite },
    { organizationId: membership.organizationId },
    {
      getApplicationById: (id, organizationId) => getApplicationById(id, organizationId),
      setFavorite: setApplicationFavorite,
    },
  );

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/jobs/${jobId}/postulados`);
  return { ok: true };
}

/** Genera (IA mock) una guía de preguntas de entrevista para un candidato en una búsqueda. */
export async function generarGuiaEntrevistaAction(
  jobId: string,
  candidateName: string,
): Promise<{ ok: boolean; questions?: string[]; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const job = await getJobById(jobId, membership.organizationId);
  if (!job) return { ok: false, error: "Búsqueda no encontrada." };

  const questions = await getAiProvider().interviewGuide({
    candidateName,
    jobTitle: job.title,
    skills: job.skills ?? [],
  });
  return { ok: true, questions };
}

/**
 * Analiza con IA (mock) todas las postulaciones de una búsqueda: calcula y persiste un score
 * de compatibilidad. La lógica de scoring vive detrás de la interfaz AiProvider; el caso de
 * uso solo orquesta y cuida el rol.
 */
export async function analizarPostuladosAction(
  jobId: string,
): Promise<{ ok: boolean; scored?: number; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const [job, applications] = await Promise.all([
    getJobById(jobId, membership.organizationId),
    listApplicationsForScoring(jobId, membership.organizationId),
  ]);
  if (!job) return { ok: false, error: "Búsqueda no encontrada." };
  if (applications.length === 0) {
    return { ok: false, error: "No hay postulaciones para analizar." };
  }

  const result = await puntuarPostulaciones(
    { job: { title: job.title, skills: job.skills }, applications },
    { organizationId: membership.organizationId, role: membership.role },
    { provider: getAiProvider(), saveScore: saveApplicationScore },
  );

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/jobs/${jobId}/postulados`);
  revalidatePath(`/jobs/${jobId}/pipeline`);
  return { ok: true, scored: result.scored };
}

/**
 * Rechaza varias postulaciones de una (bulk reject del inbox). Orquesta el mismo caso de uso
 * `moverEtapa` por cada id (la regla vive en el dominio). Tolerante: las que ya están en una
 * etapa terminal se cuentan como saltadas, no como error.
 */
export async function rechazarVariosAction(
  jobId: string,
  applicationIds: string[],
): Promise<{ ok: boolean; rejected?: number; skipped?: number; error?: string }> {
  if (!jobId || applicationIds.length === 0) {
    return { ok: false, error: "Elegí al menos una postulación." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const ctx = {
    userId: "",
    organizationId: membership.organizationId,
    role: membership.role,
  };
  const deps = {
    getApplicationById: (id: string, organizationId: string) =>
      getApplicationById(id, organizationId),
    updateApplicationStage,
  };

  let rejected = 0;
  let skipped = 0;
  for (const applicationId of applicationIds) {
    const res = await moverEtapa({ applicationId, newStage: "rejected" }, ctx, deps);
    if (res.ok) rejected += 1;
    else skipped += 1;
  }

  if (rejected === 0) {
    return { ok: false, error: "No se pudo rechazar (¿ya estaban en una etapa terminal?)." };
  }

  revalidatePath(`/jobs/${jobId}/postulados`);
  revalidatePath(`/jobs/${jobId}/pipeline`);
  return { ok: true, rejected, skipped };
}

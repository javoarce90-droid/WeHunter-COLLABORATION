"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/session";
import { postularCandidatoSchema, moverEtapaSchema, rechazarPostulacionesSchema } from "./schema";
import type { RejectionReason } from "./schema";
import { postularCandidato } from "./domain/postular-candidato";
import { moverEtapa } from "./domain/mover-etapa";
import { rechazarPostulacion } from "./domain/rechazar-postulacion";
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
import { enviarMensaje } from "../messaging/domain/enviar-mensaje";
import { ensureThread, recordOutbound } from "../messaging/data/messaging.mutations";
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
    jobTitle: job.position?.trim() || job.title,
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
    { job: { title: job.title, position: job.position, skills: job.skills }, applications },
    { organizationId: membership.organizationId, role: membership.role },
    { provider: getAiProvider(), saveScore: saveApplicationScore },
  );

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/jobs/${jobId}/postulados`);
  revalidatePath(`/jobs/${jobId}/pipeline`);
  return { ok: true, scored: result.scored };
}

/**
 * Analiza con IA una sola postulación puntual (botón por candidato en el Kanban). Evita
 * re-analizar a todo el mundo cada vez y no se ve afectada por postulaciones que entren
 * mientras corre: cada análisis queda acotado a esta postulación.
 */
export async function analizarPostulacionAction(
  applicationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const application = await getApplicationById(applicationId, membership.organizationId);
  if (!application) return { ok: false, error: "Postulación no encontrada." };

  const [job, candidate] = await Promise.all([
    getJobById(application.jobId, membership.organizationId),
    getCandidateById(application.candidateId, membership.organizationId),
  ]);
  if (!job || !candidate) return { ok: false, error: "Datos no encontrados." };

  const result = await puntuarPostulaciones(
    {
      job: { title: job.title, position: job.position, skills: job.skills },
      applications: [
        {
          id: application.id,
          candidate: {
            id: candidate.id,
            skills: candidate.skills,
            summary: candidate.summary,
            source: candidate.source,
            hasCv: candidate.cvUrl != null,
          },
        },
      ],
    },
    { organizationId: membership.organizationId, role: membership.role },
    { provider: getAiProvider(), saveScore: saveApplicationScore },
  );

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/jobs/${application.jobId}/postulados`);
  revalidatePath(`/jobs/${application.jobId}/pipeline`);
  return { ok: true };
}

export type RechazarPostulacionesInput = {
  jobId: string;
  applicationIds: string[];
  reason: RejectionReason;
  note?: string;
  notifyCandidate: boolean;
  message?: string;
};

/** Reemplaza {{candidato}} y {{puesto}} en el mensaje editable. Cada candidato del lote
 *  recibe su propio nombre; el puesto es el mismo para todo el job. */
function personalizeMessage(template: string, candidateName: string, jobTitle: string): string {
  return template.replaceAll("{{candidato}}", candidateName).replaceAll("{{puesto}}", jobTitle);
}

/**
 * Rechaza una o varias postulaciones de una (sirve tanto para el rechazo individual como
 * para el de lote — el individual manda un array de un solo id). Orquesta el caso de uso
 * `rechazarPostulacion` por cada id (motivo + nota viven en el dominio). Tolerante: las que
 * ya están descartadas o en una etapa terminal se cuentan como saltadas, no como error.
 * Si `notifyCandidate`, orquesta además `enviarMensaje` (mock) por cada rechazo exitoso —
 * es una preocupación aparte del rechazo en sí, por eso se compone acá y no en el dominio.
 */
export async function rechazarVariosAction(
  input: RechazarPostulacionesInput,
): Promise<{ ok: boolean; rejected?: number; skipped?: number; notified?: number; error?: string }> {
  const parsed = rechazarPostulacionesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { jobId, applicationIds, reason, note, notifyCandidate, message } = parsed.data;

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

  const job = notifyCandidate ? await getJobById(jobId, membership.organizationId) : null;

  let rejected = 0;
  let skipped = 0;
  let notified = 0;
  for (const applicationId of applicationIds) {
    const res = await rechazarPostulacion({ applicationId, reason, note }, ctx, deps);
    if (!res.ok) {
      skipped += 1;
      continue;
    }
    rejected += 1;

    if (notifyCandidate && job && message) {
      const candidate = await getCandidateById(res.data.candidateId, membership.organizationId);
      if (!candidate) continue;
      const body = personalizeMessage(message, candidate.fullName, job.title);
      const sent = await enviarMensaje(
        { candidateId: candidate.id, channel: "email", body },
        { organizationId: membership.organizationId, role: membership.role },
        {
          getCandidate: getCandidateById,
          ensureThread: (cId, ch) => ensureThread(membership.organizationId, cId, ch),
          recordOutbound: (threadId, b) => recordOutbound(membership.organizationId, threadId, b),
        },
      );
      if (sent.ok) notified += 1;
    }
  }

  if (rejected === 0) {
    return { ok: false, error: "No se pudo rechazar (¿ya estaban descartados o en etapa terminal?)." };
  }

  revalidatePath(`/jobs/${jobId}/postulados`);
  revalidatePath(`/jobs/${jobId}/pipeline`);
  return { ok: true, rejected, skipped, notified: notifyCandidate ? notified : undefined };
}

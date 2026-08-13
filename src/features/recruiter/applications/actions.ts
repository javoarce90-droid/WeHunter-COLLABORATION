"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import {
  APPLICATION_STAGES,
  postularCandidatoSchema,
  moverEtapaSchema,
  moverAEtapaSchema,
  rechazarPostulacionesSchema,
} from "./schema";
import type { RejectionReason } from "./schema";
import { postularCandidato } from "./domain/postular-candidato";
import { moverEtapa } from "./domain/mover-etapa";
import { moverAEtapa } from "./domain/mover-a-etapa";
import { pasarAlPipeline } from "./domain/pasar-al-pipeline";
import { guardarEnTalentPool } from "./domain/guardar-en-talent-pool";
import { rechazarPostulacion } from "./domain/rechazar-postulacion";
import { puntuarPostulaciones } from "./domain/puntuar-postulaciones";
import {
  getJobForPipeline,
  getApplicationById,
  getApplicationForMove,
  getApplicationForStageMove,
  findExistingApplication,
  listApplicationsForScoring,
  listCandidatesForApplications,
  listApplicationsByCandidate,
  type CandidateApplication,
} from "./data/applications.queries";
import {
  debeNotificarCandidato,
  toStepperStage,
  ESTADO_VISIBLE_LABELS,
} from "@/features/candidate/portal/domain/gestionar-postulacion";
import { notifyProfile } from "../notifications/data/notifications.mutations";
import {
  insertApplication,
  updateApplicationStage,
  setPipelineEntered,
  saveApplicationScore,
  moveToStage,
} from "./data/applications.mutations";
import {
  isStageActive,
  getActiveStages,
} from "../pipeline-stages/data/pipeline-stages.queries";
import { getJobStage } from "../pipeline-stages/data/job-stages.queries";
import { ensureJobStages } from "../pipeline-stages/data/job-stages.mutations";
import { legacyStageFor } from "./domain/mover-a-etapa";
import {
  getCandidateById,
  findDuplicateCandidate,
} from "../candidates/data/candidates.queries";
import { getCandidateResume } from "../candidates/data/resume.queries";
import { setSavedToPool } from "../candidates/data/candidates.mutations";
import { findLinkableProfile } from "../candidates/data/profile-link.queries";
import { getLinkedCandidateProfile } from "../candidates/data/linked-profile.queries";
import { getJobById } from "../jobs/data/jobs.queries";
import { can } from "@/lib/auth/roles";
import { candidateCreateInputSchema } from "../candidates/schema";
import { cargarCandidato } from "../candidates/domain/cargar-candidato";
import type { DuplicateCandidateMatch } from "../candidates/domain/duplicate-keys";
import { insertCandidate } from "../candidates/data/candidates.mutations";
import { enviarMensaje } from "../messaging/domain/enviar-mensaje";
import { MESSAGE_CHANNELS } from "../messaging/schema";
import {
  ensureThread,
  recordOutbound,
} from "../messaging/data/messaging.mutations";
import { insertNote } from "../notes/data/notes.mutations";
import { getAiProvider } from "@/lib/ai";

export interface ApplicationActionState {
  error?: string;
  duplicate?: DuplicateCandidateMatch;
  profileMatch?: true;
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
      getJobById: (jobId, organizationId) =>
        getJobForPipeline(jobId, organizationId),
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

  revalidatePath(`/jobs/${parsed.data.jobId}/postulados`);
  return {};
}

export interface PostularVariosResult {
  ok: boolean;
  /** Cuántos se agregaron (quedan en Postulados, pendientes de revisión). */
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
    getJobById: (id: string, organizationId: string) =>
      getJobForPipeline(id, organizationId),
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
    return {
      ok: false,
      error: firstError ?? "No se pudo postular a los candidatos.",
    };
  }

  revalidatePath(`/jobs/${jobId}/postulados`);
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

  const parsed = candidateCreateInputSchema.safeParse({
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

  const confirmDuplicate = formData.get("confirmDuplicate") === "true";
  const linkProfile = formData.get("linkProfile") === "true";
  const skipProfileLink = formData.get("skipProfileLink") === "true";

  // 1. Alta en el pool (sin CV: el enriquecimiento se hace después desde la ficha).
  const created = await cargarCandidato(
    { ...parsed.data, confirmDuplicate, linkProfile, skipProfileLink },
    { organizationId: membership.organizationId, role: membership.role },
    { findDuplicateCandidate, findLinkableProfile, insertCandidate },
  );
  if (!created.ok) {
    return {
      error: created.error,
      duplicate: created.duplicate,
      profileMatch: created.profileMatch,
    };
  }

  // 2. Postular a la búsqueda. Mismo caso de uso (y deps) que el postular del pool.
  const postulado = await postularCandidato(
    { jobId, candidateId: created.data.candidateId },
    {
      userId: "",
      organizationId: membership.organizationId,
      role: membership.role,
    },
    {
      getJobById: (id, organizationId) => getJobForPipeline(id, organizationId),
      getCandidateById: (id, organizationId) =>
        getCandidateById(id, organizationId),
      findExistingApplication: (jId, cId) => findExistingApplication(jId, cId),
      createApplication: insertApplication,
    },
  );
  if (!postulado.ok) {
    return {
      error: `Candidato creado en el pool, pero no se pudo postular: ${postulado.error}`,
    };
  }

  revalidatePath(`/jobs/${jobId}/postulados`);
  return {};
}

const importarSourcingResultadoSchema = z.object({
  jobId: z.string().uuid("ID de búsqueda inválido."),
  name: z.string().trim().min(1),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  skills: z.array(z.string()),
  linkedinUrl: z.string().trim().min(1),
  summary: z.string().nullable().optional(),
});

/**
 * Suma al pool y postula en un paso a un candidato encontrado por "Sourcing con IA" desde
 * Postulados (ítem 9.4). A diferencia de `crearYPostularCandidatoAction`, el candidato viene
 * de LinkedIn (sin email) — no se puede reusar `cargarCandidato`, que exige email siempre. Se
 * dedupea por `linkedinUrl`: si el recruiter vuelve a correr sourcing y aparece el mismo
 * perfil, se postula al candidato ya existente en vez de duplicarlo en el pool.
 */
export async function importarSourcingResultadoAction(input: {
  jobId: string;
  name: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  linkedinUrl: string;
  summary?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = importarSourcingResultadoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };
  if (!can(membership.role, "candidates.manage")) {
    return { ok: false, error: "Tu rol no permite usar sourcing." };
  }

  const duplicate = await findDuplicateCandidate(membership.organizationId, {
    linkedinUrl: parsed.data.linkedinUrl,
  });

  const candidateId = duplicate
    ? duplicate.id
    : (
        await insertCandidate({
          organizationId: membership.organizationId,
          fullName: parsed.data.name,
          email: null,
          cvUrl: null,
          headline: parsed.data.headline,
          location: parsed.data.location,
          linkedinUrl: parsed.data.linkedinUrl,
          summary: parsed.data.summary ?? null,
          skills: parsed.data.skills.length > 0 ? parsed.data.skills : null,
          source: "linkedin",
          phone: null,
        })
      ).candidateId;

  const postulado = await postularCandidato(
    { jobId: parsed.data.jobId, candidateId },
    {
      userId: "",
      organizationId: membership.organizationId,
      role: membership.role,
    },
    {
      getJobById: (id, organizationId) => getJobForPipeline(id, organizationId),
      getCandidateById: (id, organizationId) =>
        getCandidateById(id, organizationId),
      findExistingApplication: (jId, cId) => findExistingApplication(jId, cId),
      createApplication: insertApplication,
    },
  );
  if (!postulado.ok) return { ok: false, error: postulado.error };

  revalidatePath(`/jobs/${parsed.data.jobId}/postulados`);
  return { ok: true };
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

  const application = await getApplicationForMove(
    parsed.data.applicationId,
    membership.organizationId,
  );
  if (!application) {
    return { error: "Postulación no encontrada." };
  }

  const result = await moverEtapa(
    parsed.data,
    {
      userId: "",
      organizationId: membership.organizationId,
      role: membership.role,
    },
    {
      getApplicationById: async () => application,
      isStageActive,
      updateApplicationStage,
    },
  );

  if (!result.ok) {
    return { error: result.error };
  }

  if (
    application.candidateProfileId &&
    debeNotificarCandidato(application.stage, result.data.stage)
  ) {
    // Aviso al candidato: efecto secundario no crítico, no debe hacer fallar un cambio de
    // etapa que ya se persistió (mismo criterio que enviarMensaje en rechazarVariosAction).
    try {
      await notifyProfile(
        membership.organizationId,
        application.candidateProfileId,
        {
          type: "candidate_status",
          title: `Tu postulación a "${application.jobTitle}" pasó a "${ESTADO_VISIBLE_LABELS[toStepperStage(result.data.stage)]}"`,
          link: "/portal/mis-postulaciones",
        },
      );
    } catch {
      // no-op: el cambio de etapa ya se aplicó, un fallo al notificar no debe revertirlo.
    }
  }

  revalidatePath(`/jobs/${result.data.jobId}/pipeline`);
  revalidatePath(`/jobs/${result.data.jobId}/postulados`);
  return {};
}

/**
 * Mover un candidato dentro del tablero por-búsqueda (`job_stages`). Reemplaza a
 * `moverEtapaAction` para el Kanban: esa sigue existiendo para consumidores que aún operan
 * por el enum legacy.
 */
export async function moverAEtapaAction(
  _prev: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const parsed = moverAEtapaSchema.safeParse({
    applicationId: formData.get("applicationId"),
    toStageId: formData.get("toStageId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) {
    return { error: "No autorizado." };
  }

  const application = await getApplicationForStageMove(
    parsed.data.applicationId,
    membership.organizationId,
  );
  if (!application) {
    return { error: "Postulación no encontrada." };
  }

  const result = await moverAEtapa(
    parsed.data,
    {
      userId: "",
      organizationId: membership.organizationId,
      role: membership.role,
    },
    {
      getApplication: async () => application,
      getStage: getJobStage,
      moveToStage,
    },
  );

  if (!result.ok) {
    return { error: result.error };
  }

  if (application.candidateProfileId) {
    const targetStage = await getJobStage(
      parsed.data.toStageId,
      membership.organizationId,
    );
    if (targetStage) {
      const toLegacyStage = legacyStageFor(targetStage);
      if (debeNotificarCandidato(application.stage, toLegacyStage)) {
        // Aviso al candidato: efecto secundario no crítico, no debe hacer fallar un cambio de
        // etapa que ya se persistió (mismo criterio que moverEtapaAction).
        try {
          await notifyProfile(
            membership.organizationId,
            application.candidateProfileId,
            {
              type: "candidate_status",
              title: `Tu postulación a "${application.jobTitle}" pasó a "${ESTADO_VISIBLE_LABELS[toStepperStage(toLegacyStage)]}"`,
              link: "/portal/mis-postulaciones",
            },
          );
        } catch {
          // no-op
        }
      }
    }
  }

  revalidatePath(`/jobs/${application.jobId}/pipeline`);
  revalidatePath(`/jobs/${application.jobId}/postulados`);
  return {};
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
  const [user, membership] = await Promise.all([
    getCurrentUser(),
    getActiveMembership(),
  ]);
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
    {
      job: {
        title: job.title,
        position: job.position,
        skills: job.skills,
        objectives: job.objectives,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
      },
      applications,
    },
    { organizationId: membership.organizationId, role: membership.role },
    { provider: getAiProvider(), saveScore: saveApplicationScore },
  );

  if (!result.ok) return { ok: false, error: result.error };

  if (user) {
    try {
      await notifyProfile(membership.organizationId, user.id, {
        type: "background_job",
        title: `Análisis de IA listo: ${result.scored} postulación${result.scored !== 1 ? "es" : ""} de "${job.title}"`,
        link: `/jobs/${jobId}/postulados`,
      });
    } catch {
      // no-op: el análisis ya se aplicó, un fallo al notificar no debe revertirlo.
    }
  }

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
  const [user, membership] = await Promise.all([
    getCurrentUser(),
    getActiveMembership(),
  ]);
  if (!membership) return { ok: false, error: "No autorizado." };

  const application = await getApplicationById(
    applicationId,
    membership.organizationId,
  );
  if (!application) return { ok: false, error: "Postulación no encontrada." };

  const [job, candidate] = await Promise.all([
    getJobById(application.jobId, membership.organizationId),
    getCandidateById(application.candidateId, membership.organizationId),
  ]);
  if (!job || !candidate) return { ok: false, error: "Datos no encontrados." };

  // Para candidatos vinculados, profiles es la fuente de verdad de bio/skills para el scoring —
  // sin tocar candidates.summary/skills (eso lo lee la ficha, separada a propósito). Para
  // candidatos sin vincular, la experiencia/educación vive en `candidate_*` (carga manual del
  // recruiter, mismo query que ya usa la ficha/copiloto) — nunca las dos fuentes a la vez.
  const [linkedProfile, resume] = await Promise.all([
    candidate.profileId
      ? getLinkedCandidateProfile(candidate.id)
      : Promise.resolve(null),
    candidate.profileId
      ? Promise.resolve(null)
      : getCandidateResume(candidate.id),
  ]);

  const result = await puntuarPostulaciones(
    {
      job: {
        title: job.title,
        position: job.position,
        skills: job.skills,
        objectives: job.objectives,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
      },
      applications: [
        {
          id: application.id,
          candidate: {
            id: candidate.id,
            skills: candidate.skills?.length
              ? candidate.skills
              : (linkedProfile?.skills ?? null),
            summary: candidate.summary ?? linkedProfile?.bio ?? null,
            source: candidate.source,
            experience: (
              linkedProfile?.experiences ??
              resume?.experiences ??
              []
            ).map((e) => ({
              position: e.position,
              company: e.company,
              description: e.description,
            })),
            education: (
              linkedProfile?.education ??
              resume?.education ??
              []
            ).map((e) => ({
              degree: e.degree,
              institution: e.institution,
              fieldOfStudy: e.fieldOfStudy,
            })),
          },
        },
      ],
    },
    { organizationId: membership.organizationId, role: membership.role },
    { provider: getAiProvider(), saveScore: saveApplicationScore },
  );

  if (!result.ok) return { ok: false, error: result.error };

  if (user) {
    try {
      await notifyProfile(membership.organizationId, user.id, {
        type: "background_job",
        title: `Análisis de IA listo: ${candidate.fullName}`,
        link: `/jobs/${application.jobId}/pipeline`,
      });
    } catch {
      // no-op: el análisis ya se aplicó, un fallo al notificar no debe revertirlo.
    }
  }

  revalidatePath(`/jobs/${application.jobId}/postulados`);
  revalidatePath(`/jobs/${application.jobId}/pipeline`);
  return { ok: true };
}

export type AccionMasivaResult = {
  ok: boolean;
  /** Cuántas postulaciones cambiaron de estado. */
  hechas?: number;
  /** Cuántas se saltaron por una regla de negocio (ya avanzadas, descartadas, etc.). */
  saltadas?: number;
  error?: string;
};

const accionMasivaSchema = z.object({
  jobId: z.string().uuid("ID de búsqueda inválido."),
  applicationIds: z
    .array(z.string().uuid("ID de postulación inválido."))
    .min(1, "Elegí al menos una postulación."),
});

/**
 * Avanza una o varias postulaciones de la bandeja al pipeline (el individual manda un array
 * de un solo id, igual que `rechazarVariosAction`). Tolerante: las que ya estaban en el
 * pipeline se cuentan como saltadas, no hacen fallar al resto del lote.
 */
export async function pasarAlPipelineAction(input: {
  jobId: string;
  applicationIds: string[];
  toStage?: string;
}): Promise<AccionMasivaResult> {
  const parsed = accionMasivaSchema
    .extend({ toStage: z.enum(APPLICATION_STAGES).optional() })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const { jobId, applicationIds, toStage } = parsed.data;

  const [user, membership] = await Promise.all([
    getCurrentUser(),
    getActiveMembership(),
  ]);
  if (!membership) return { ok: false, error: "No autorizado." };

  const ctx = {
    userId: "",
    organizationId: membership.organizationId,
    role: membership.role,
  };
  const deps = {
    getApplicationById,
    getActiveStages,
    ensureJobStages,
    setPipelineEntered,
  };

  let hechas = 0;
  let saltadas = 0;
  let firstError: string | undefined;
  for (const applicationId of applicationIds) {
    const res = await pasarAlPipeline({ applicationId, toStage }, ctx, deps);
    if (res.ok) hechas += 1;
    else {
      saltadas += 1;
      firstError ??= res.error;
    }
  }

  if (hechas === 0) {
    return {
      ok: false,
      error: firstError ?? "No se pudo avanzar a los candidatos.",
    };
  }

  if (user) {
    try {
      await notifyProfile(membership.organizationId, user.id, {
        type: "background_job",
        title: `${hechas} candidato${hechas !== 1 ? "s" : ""} pasado${hechas !== 1 ? "s" : ""} al pipeline`,
        link: `/jobs/${jobId}/pipeline`,
      });
    } catch {
      // no-op: la acción ya se aplicó, un fallo al notificar no debe revertirla.
    }
  }

  revalidatePath(`/jobs/${jobId}/postulados`);
  revalidatePath(`/jobs/${jobId}/pipeline`);
  return { ok: true, hechas, saltadas };
}

/**
 * Suma uno o varios candidatos al pool de talento del recruiter (ver `guardarEnTalentPool`):
 * es una acción sobre el CANDIDATO, no un estado de esta postulación — no toca `stage` ni
 * `pipelineEnteredAt`. Los que ya son parte del pool se cuentan como saltados, no error.
 */
export async function guardarEnTalentPoolAction(input: {
  jobId: string;
  applicationIds: string[];
  note?: string;
}): Promise<AccionMasivaResult> {
  const parsed = accionMasivaSchema
    .extend({ note: z.string().trim().max(500).optional() })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const { jobId, applicationIds, note } = parsed.data;

  const [user, membership] = await Promise.all([
    getCurrentUser(),
    getActiveMembership(),
  ]);
  if (!membership) return { ok: false, error: "No autorizado." };

  const ctx = {
    userId: user?.id ?? "",
    organizationId: membership.organizationId,
    role: membership.role,
  };
  const deps = {
    getApplicationById,
    getCandidateSavedToPool: async (
      candidateId: string,
      organizationId: string,
    ) => {
      const candidate = await getCandidateById(candidateId, organizationId);
      return candidate ? candidate.savedToPool : null;
    },
    setSavedToPool,
    insertNote,
  };

  let hechas = 0;
  let saltadas = 0;
  let firstError: string | undefined;
  for (const applicationId of applicationIds) {
    const res = await guardarEnTalentPool({ applicationId, note }, ctx, deps);
    if (res.ok) hechas += 1;
    else {
      saltadas += 1;
      firstError ??= res.error;
    }
  }

  if (hechas === 0) {
    return {
      ok: false,
      error: firstError ?? "No se pudo guardar en el Talent Pool.",
    };
  }

  if (user) {
    try {
      await notifyProfile(membership.organizationId, user.id, {
        type: "background_job",
        title: `${hechas} candidato${hechas !== 1 ? "s" : ""} guardado${hechas !== 1 ? "s" : ""} en el Talent Pool`,
        link: "/candidates",
      });
    } catch {
      // no-op: la acción ya se aplicó, un fallo al notificar no debe revertirla.
    }
  }

  revalidatePath(`/jobs/${jobId}/postulados`);
  revalidatePath(`/jobs/${jobId}/pipeline`);
  revalidatePath("/candidates");
  return { ok: true, hechas, saltadas };
}

/**
 * Contacta a uno o varios postulados desde la bandeja. Orquesta `enviarMensaje` por candidato
 * (la regla vive en el dominio de mensajería) personalizando el cuerpo con el nombre de cada
 * uno — mismo mecanismo que ya usa el rechazo cuando notifica.
 */
export async function contactarPostuladosAction(input: {
  jobId: string;
  applicationIds: string[];
  channel: string;
  body: string;
}): Promise<AccionMasivaResult> {
  const parsed = accionMasivaSchema
    .extend({
      channel: z.enum(MESSAGE_CHANNELS, {
        errorMap: () => ({ message: "Canal inválido." }),
      }),
      body: z.string().trim().min(1, "Escribí el mensaje."),
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const { jobId, applicationIds, channel, body } = parsed.data;

  const [user, membership] = await Promise.all([
    getCurrentUser(),
    getActiveMembership(),
  ]);
  if (!membership) return { ok: false, error: "No autorizado." };
  const org = membership.organizationId;

  const job = await getJobById(jobId, org);
  if (!job) return { ok: false, error: "Búsqueda no encontrada." };

  const destinatarios = await listCandidatesForApplications(
    applicationIds,
    org,
  );

  let hechas = 0;
  let saltadas = applicationIds.length - destinatarios.length;
  let firstError: string | undefined;

  for (const candidate of destinatarios) {
    const res = await enviarMensaje(
      {
        candidateId: candidate.id,
        channel,
        body: personalizeMessage(body, candidate.fullName, job.title),
      },
      { organizationId: org, role: membership.role },
      {
        getCandidate: async () => candidate,
        ensureThread: (cId, ch) => ensureThread(org, cId, ch),
        recordOutbound: (threadId, b) => recordOutbound(org, threadId, b),
      },
    );
    if (res.ok) hechas += 1;
    else {
      saltadas += 1;
      firstError ??= res.error;
    }
  }

  if (hechas === 0) {
    return { ok: false, error: firstError ?? "No se pudo enviar el mensaje." };
  }

  if (user) {
    try {
      await notifyProfile(org, user.id, {
        type: "background_job",
        title: `Mensaje enviado a ${hechas} candidato${hechas !== 1 ? "s" : ""}`,
        link: `/jobs/${jobId}/postulados`,
      });
    } catch {
      // no-op: los mensajes ya se enviaron, un fallo al notificar no debe revertirlo.
    }
  }

  revalidatePath("/messages");
  return { ok: true, hechas, saltadas };
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
function personalizeMessage(
  template: string,
  candidateName: string,
  jobTitle: string,
): string {
  return template
    .replaceAll("{{candidato}}", candidateName)
    .replaceAll("{{puesto}}", jobTitle);
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
): Promise<{
  ok: boolean;
  rejected?: number;
  skipped?: number;
  notified?: number;
  error?: string;
}> {
  const parsed = rechazarPostulacionesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const { jobId, applicationIds, reason, note, notifyCandidate, message } =
    parsed.data;

  const [user, membership] = await Promise.all([
    getCurrentUser(),
    getActiveMembership(),
  ]);
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

  const job = notifyCandidate
    ? await getJobById(jobId, membership.organizationId)
    : null;

  let rejected = 0;
  let skipped = 0;
  let notified = 0;
  for (const applicationId of applicationIds) {
    const res = await rechazarPostulacion(
      { applicationId, reason, note },
      ctx,
      deps,
    );
    if (!res.ok) {
      skipped += 1;
      continue;
    }
    rejected += 1;

    if (notifyCandidate && job && message) {
      const candidate = await getCandidateById(
        res.data.candidateId,
        membership.organizationId,
      );
      if (!candidate) continue;
      const body = personalizeMessage(message, candidate.fullName, job.title);
      const sent = await enviarMensaje(
        { candidateId: candidate.id, channel: "email", body },
        { organizationId: membership.organizationId, role: membership.role },
        {
          getCandidate: getCandidateById,
          ensureThread: (cId, ch) =>
            ensureThread(membership.organizationId, cId, ch),
          recordOutbound: (threadId, b) =>
            recordOutbound(membership.organizationId, threadId, b),
        },
      );
      if (sent.ok) notified += 1;
    }
  }

  if (rejected === 0) {
    return {
      ok: false,
      error:
        "No se pudo rechazar (¿ya estaban descartados o en etapa terminal?).",
    };
  }

  if (user) {
    try {
      await notifyProfile(membership.organizationId, user.id, {
        type: "background_job",
        title: `${rejected} candidato${rejected !== 1 ? "s" : ""} rechazado${rejected !== 1 ? "s" : ""}`,
        link: `/jobs/${jobId}/postulados`,
      });
    } catch {
      // no-op: el rechazo ya se aplicó, un fallo al notificar no debe revertirlo.
    }
  }

  revalidatePath(`/jobs/${jobId}/postulados`);
  revalidatePath(`/jobs/${jobId}/pipeline`);
  return {
    ok: true,
    rejected,
    skipped,
    notified: notifyCandidate ? notified : undefined,
  };
}

export type FichaCandidatoData = {
  candidate: {
    email: string | null;
    phone: string | null;
    location: string | null;
    linkedinUrl: string | null;
    summary: string | null;
    skills: string[] | null;
    cvUrl: string | null;
  };
  resume: Awaited<ReturnType<typeof getCandidateResume>>;
  otherApplications: CandidateApplication[];
};

/**
 * Datos "profundos" de un candidato para la pestaña Perfil/Postulaciones de su ficha
 * (abierta desde "Ver detalle" en Postulados) — a diferencia de notas/historial, que ya
 * llegan precargados por job (ver postulados/page.tsx), esto se pide bajo demanda recién
 * cuando se abre la ficha: es más pesado (currículum completo) y la mayoría de las filas de
 * la bandeja nunca llegan a abrirse (database.md #6/#7).
 */
export async function getFichaCandidatoAction(
  candidateId: string,
): Promise<
  { ok: true; data: FichaCandidatoData } | { ok: false; error: string }
> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const [candidate, resume, otherApplications] = await Promise.all([
    getCandidateById(candidateId, membership.organizationId),
    getCandidateResume(candidateId),
    listApplicationsByCandidate(candidateId, membership.organizationId),
  ]);
  if (!candidate) return { ok: false, error: "Candidato no encontrado." };

  return {
    ok: true,
    data: {
      candidate: {
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        linkedinUrl: candidate.linkedinUrl,
        summary: candidate.summary,
        skills: candidate.skills,
        cvUrl: candidate.cvUrl,
      },
      resume,
      otherApplications,
    },
  };
}

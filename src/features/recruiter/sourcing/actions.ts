"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { insertCandidate, insertCandidateResume } from "../candidates/data/candidates.mutations";
import {
  findDuplicateCandidate,
  findExistingCandidateKeys,
} from "../candidates/data/candidates.queries";
import { findCachedProfile } from "./data/sourcing-provider-profiles.queries";
import { upsertCachedProfile } from "./data/sourcing-provider-profiles.mutations";
import {
  sourcearParaBusqueda,
  SOURCING_MAX_RESULTS,
  type ScoredLinkedInCandidate,
  type SourcingMetrics,
} from "./domain/sourcear-para-busqueda";
import { getSourcingProvider } from "./domain/get-sourcing-provider";
import { recordSourcingConsumption } from "./domain/sourcing-consumption-event";
import { getJobById } from "../jobs/data/jobs.queries";
import { getAiProvider } from "@/lib/ai";
import { can } from "@/lib/auth/roles";
import { notifyProfile } from "../notifications/data/notifications.mutations";
import {
  getSourcingSession,
  type SourcingSession,
} from "./data/sourcing-sessions.queries";
import {
  saveSourcingSession,
  deleteSourcingSession,
} from "./data/sourcing-sessions.mutations";

const importExperienceSchema = z.object({
  company: z.string(),
  position: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  description: z.string().nullable(),
});
const importEducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});
const importCertificationSchema = z.object({ name: z.string(), url: z.string().nullable() });
const importLanguageSchema = z.object({ language: z.string(), level: z.string().nullable() });

const importSchema = z.object({
  name: z.string().trim().min(1),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  skills: z.array(z.string()),
  linkedinUrl: z.string().optional().nullable(),
  email: z.string().trim().email().nullable().optional(),
  experience: z.array(importExperienceSchema).optional(),
  education: z.array(importEducationSchema).optional(),
  certifications: z.array(importCertificationSchema).optional(),
  languages: z.array(importLanguageSchema).optional(),
});

export async function importarSourcingAction(result: {
  name: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  linkedinUrl?: string | null;
  email?: string | null;
  experience?: { company: string; position: string; startDate: string | null; endDate: string | null; description: string | null }[];
  education?: { institution: string; degree: string; fieldOfStudy: string | null; startDate: string | null; endDate: string | null }[];
  certifications?: { name: string; url: string | null }[];
  languages?: { language: string; level: string | null }[];
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = importSchema.safeParse(result);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };
  if (!can(membership.role, "candidates.manage")) {
    return { ok: false, error: "Tu rol no permite usar sourcing." };
  }

  // Mismo criterio que importarSourcingResultadoAction (camino "postular"): si ya está en el
  // pool por linkedinUrl o email, no lo duplica — ya está donde el recruiter lo quería.
  const duplicate = await findDuplicateCandidate(membership.organizationId, {
    linkedinUrl: parsed.data.linkedinUrl,
    email: parsed.data.email ?? null,
  });
  if (!duplicate) {
    const { candidateId } = await insertCandidate({
      organizationId: membership.organizationId,
      fullName: parsed.data.name,
      email: parsed.data.email ?? null,
      cvUrl: null,
      headline: parsed.data.headline,
      location: parsed.data.location,
      linkedinUrl: parsed.data.linkedinUrl ?? null,
      summary: null,
      skills: parsed.data.skills.length > 0 ? parsed.data.skills : null,
      seniority: null,
      source: "linkedin",
      phone: null,
    });

    // Currículum estructurado solo al crear — mismo criterio que importarSourcingResultadoAction.
    await insertCandidateResume(candidateId, {
      workExperiences: (parsed.data.experience ?? []).map((e) => ({
        company: e.company,
        position: e.position,
        startDate: e.startDate,
        endDate: e.endDate,
        description: e.description,
        employmentType: null,
        modality: null,
        skills: null,
      })),
      education: (parsed.data.education ?? []).map((e) => ({
        institution: e.institution,
        degree: e.degree,
        fieldOfStudy: e.fieldOfStudy,
        startDate: e.startDate,
        endDate: e.endDate,
        description: null,
        grade: null,
        activities: null,
      })),
      certifications: parsed.data.certifications ?? [],
      languages: parsed.data.languages ?? [],
    });
  }

  revalidatePath("/candidates");
  return { ok: true };
}

const sourcearParaBusquedaSchema = z.object({
  // Cuántos candidatos nuevos quiere el reclutador, elegido de antemano (design.md §1.1 — ya
  // no existe "Buscar más candidatos", es una sola búsqueda por cantidad).
  maxResults: z.number().int().min(1).max(SOURCING_MAX_RESULTS),
});

/**
 * Sourcing con IA de un clic desde Postulados (ítem 9.4): busca en LinkedIn usando el contexto
 * de la búsqueda (puesto, skills, seniority, ubicación), sin que el recruiter tipee nada, y
 * scorea con IA solo a los candidatos que todavía no están en el pool. Una sola búsqueda por
 * `maxResults` candidatos — reemplaza los resultados anteriores de esta búsqueda, no los
 * acumula (design.md §1.1).
 */
export async function sourcearParaBusquedaAction(
  jobId: string,
  maxResults: number = SOURCING_MAX_RESULTS,
): Promise<{
  ok: boolean;
  results?: ScoredLinkedInCandidate[];
  isLiveApi?: boolean;
  metrics?: SourcingMetrics;
  error?: string;
}> {
  const parsed = sourcearParaBusquedaSchema.safeParse({ maxResults });
  if (!parsed.success) return { ok: false, error: "Cantidad de candidatos inválida." };

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!membership) return { ok: false, error: "No autorizado." };
  if (!can(membership.role, "candidates.manage")) {
    return { ok: false, error: "Tu rol no permite usar sourcing." };
  }

  const job = await getJobById(jobId, membership.organizationId);
  if (!job) return { ok: false, error: "Búsqueda no encontrada." };

  const provider = getAiProvider();
  const sourcingProvider = getSourcingProvider();

  const result = await sourcearParaBusqueda(
    {
      title: job.title,
      position: job.position,
      skills: job.skills,
      seniority: job.seniority,
      location: job.location,
      objectives: job.objectives,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
    },
    parsed.data.maxResults,
    {
      search: (filters, max, exclude) => sourcingProvider.search(filters, max, exclude),
      scoreApplicationsBatch: (input) => provider.scoreApplicationsBatch(input),
      findExistingCandidateKeys: (args) =>
        findExistingCandidateKeys(membership.organizationId, args),
      recordConsumption: (event) =>
        recordSourcingConsumption({
          ...event,
          organizationId: membership.organizationId,
          jobId,
          occurredAt: new Date(),
        }),
      findCachedProfile: (linkedinUrl) =>
        findCachedProfile(membership.organizationId, linkedinUrl),
      cacheProfile: (candidate) => upsertCachedProfile(membership.organizationId, candidate),
    },
  );

  if (!result.ok) return { ok: false, error: result.error };

  // El recruiter puede haber navegado a otra subtab mientras esto corría (búsqueda + scorings de
  // IA tardan) — la sesión persistida le permite restaurar al volver, y la notificación le avisa.
  // La sesión persiste hasta que el recruiter la limpia explícitamente (design.md §1.1,
  // `limpiarSourcingSessionAction`) — no hasta un cursor que ya no existe. La columna `attempt`
  // queda sin uso real (0 fijo) hasta que el grupo 10 de tasks.md la retire.
  if (user) {
    try {
      await saveSourcingSession(membership.organizationId, jobId, user.id, {
        attempt: 0,
        results: result.results,
        metrics: result.metrics,
        isLiveApi: result.isLiveApi,
      });
    } catch {
      // no-op: el sourcing ya terminó, un fallo al persistir no debe hacer fallar la respuesta.
    }

    try {
      const { nuevos } = result.metrics;
      const title =
        nuevos > 0
          ? `Encontramos ${nuevos} candidato${nuevos === 1 ? "" : "s"} nuevo${nuevos === 1 ? "" : "s"} para "${job.title}"`
          : `No encontramos candidatos nuevos para "${job.title}" — probá ajustando la búsqueda`;
      await notifyProfile(membership.organizationId, user.id, {
        type: "background_job",
        title,
        link: `/jobs/${jobId}/postulados?sourcing=1`,
      });
    } catch {
      // no-op: el sourcing ya terminó, un fallo al notificar no debe hacer fallar la respuesta.
    }
  }

  return {
    ok: true,
    results: result.results,
    isLiveApi: result.isLiveApi,
    metrics: result.metrics,
  };
}

const sourcingSessionSchema = z.object({ jobId: z.string().uuid("ID de búsqueda inválido.") });

/** Hidrata `AiJobSourcingResults` al montar: si este recruiter tiene una sesión en curso para
 *  este job (no la limpió, no navegó afuera antes de revisarla), la devuelve para restaurarla
 *  sin repetir la búsqueda. */
export async function getSourcingSessionAction(jobId: string): Promise<{
  ok: boolean;
  session?: SourcingSession | null;
  error?: string;
}> {
  const parsed = sourcingSessionSchema.safeParse({ jobId });
  if (!parsed.success) return { ok: false, error: "ID de búsqueda inválido." };

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) return { ok: false, error: "No autorizado." };
  if (!can(membership.role, "candidates.manage")) {
    return { ok: false, error: "Tu rol no permite usar sourcing." };
  }

  const session = await getSourcingSession(membership.organizationId, jobId, user.id);
  return { ok: true, session };
}

/** Borra la sesión persistida — se llama desde "Limpiar" en el cliente. */
export async function limpiarSourcingSessionAction(
  jobId: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = sourcingSessionSchema.safeParse({ jobId });
  if (!parsed.success) return { ok: false, error: "ID de búsqueda inválido." };

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) return { ok: false, error: "No autorizado." };
  if (!can(membership.role, "candidates.manage")) {
    return { ok: false, error: "Tu rol no permite usar sourcing." };
  }

  await deleteSourcingSession(membership.organizationId, jobId, user.id);
  return { ok: true };
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { insertCandidate } from "../candidates/data/candidates.mutations";
import {
  findDuplicateCandidate,
  findExistingLinkedinUrls,
} from "../candidates/data/candidates.queries";
import {
  scoreLinkedInCandidate,
  sourcearParaBusqueda,
  mergeSourcingBatch,
  MAX_SEARCH_STEPS,
  type ScoredLinkedInCandidate,
  type SourcingMetrics,
} from "./domain/sourcear-para-busqueda";
import { normalizeLinkedinKey } from "../candidates/domain/duplicate-keys";
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

const importSchema = z.object({
  name: z.string().trim().min(1),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  skills: z.array(z.string()),
  linkedinUrl: z.string().optional().nullable(),
});

export async function importarSourcingAction(result: {
  name: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  linkedinUrl?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = importSchema.safeParse(result);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };
  if (!can(membership.role, "candidates.manage")) {
    return { ok: false, error: "Tu rol no permite usar sourcing." };
  }

  // Mismo criterio que importarSourcingResultadoAction (camino "postular"): si ya está en el
  // pool por linkedinUrl, no lo duplica — ya está donde el recruiter lo quería.
  const duplicate = await findDuplicateCandidate(membership.organizationId, {
    linkedinUrl: parsed.data.linkedinUrl,
  });
  if (!duplicate) {
    await insertCandidate({
      organizationId: membership.organizationId,
      fullName: parsed.data.name,
      email: null,
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
  }

  revalidatePath("/candidates");
  return { ok: true };
}

const linkedinQuerySchema = z.object({
  query: z.string().trim().min(1, "Ingresá un término de búsqueda"),
});

export async function buscarLinkedinAction(input: { query: string }): Promise<{
  ok: boolean;
  candidates?: import("./domain/linkedin-search").LinkedInCandidateResult[];
  isLiveApi?: boolean;
  error?: string;
}> {
  const parsed = linkedinQuerySchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Query inválida.",
    };

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const { searchLinkedInCandidates } = await import("./domain/linkedin-search");
  const res = await searchLinkedInCandidates(parsed.data);

  if (res.error) {
    return { ok: false, error: res.error, isLiveApi: false };
  }

  return { ok: true, candidates: res.candidates, isLiveApi: res.isLiveApi };
}

const sourcearParaBusquedaSchema = z.object({
  // 0 = búsqueda nueva; cualquier valor > 0 = "Buscar más candidatos" (el cursor real lo lleva
  // la sesión, el cliente no lo trackea).
  step: z.number().int().min(0).max(MAX_SEARCH_STEPS),
});

/**
 * Sourcing con IA de un clic desde Postulados (ítem 9.4): busca en LinkedIn usando el contexto
 * de la búsqueda (puesto, skills, seniority, ubicación), sin que el recruiter tipee nada, y
 * scorea con IA solo a los candidatos que todavía no están en el pool NI ya le mostramos.
 * `step` es el cursor: 0 = búsqueda nueva (reemplaza todo); >0 = "Buscar más candidatos"
 * (acumula, y el server avanza páginas/variantes de Serper desde donde quedó — ver
 * `sourcearParaBusqueda`). Devuelve el listado ACUMULADO completo + si ya no queda nada por
 * buscar (`exhausted`).
 */
export async function sourcearParaBusquedaAction(
  jobId: string,
  step = 0,
): Promise<{
  ok: boolean;
  results?: ScoredLinkedInCandidate[];
  isLiveApi?: boolean;
  metrics?: SourcingMetrics;
  exhausted?: boolean;
  error?: string;
}> {
  const parsed = sourcearParaBusquedaSchema.safeParse({ step });
  if (!parsed.success) return { ok: false, error: "Paso de búsqueda inválido." };

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!membership) return { ok: false, error: "No autorizado." };
  if (!can(membership.role, "candidates.manage")) {
    return { ok: false, error: "Tu rol no permite usar sourcing." };
  }

  const job = await getJobById(jobId, membership.organizationId);
  if (!job) return { ok: false, error: "Búsqueda no encontrada." };

  const { searchLinkedInCandidates } = await import("./domain/linkedin-search");
  const provider = getAiProvider();

  // "Buscar más" arranca del cursor de la sesión previa y de los perfiles ya mostrados, para no
  // repetirlos. Búsqueda nueva (step 0) parte de cero.
  const isFresh = parsed.data.step === 0;
  const previa =
    !isFresh && user
      ? await getSourcingSession(membership.organizationId, jobId, user.id)
      : null;
  const seedResults = previa?.results ?? [];
  const seenKeys = seedResults.map(
    (r) => normalizeLinkedinKey(r.linkedinUrl) ?? r.id,
  );
  // El cursor real vive en la sesión (columna `attempt`); el cliente solo dice "nueva" vs "más".
  const startStep = isFresh ? 0 : (previa?.attempt ?? 0);

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
    {
      search: (query, page) => searchLinkedInCandidates({ query }, page),
      scoreApplication: (input) => provider.scoreApplication(input),
      scoreApplicationsBatch: (input) => provider.scoreApplicationsBatch(input),
      findExistingLinkedinUrls: (urls) =>
        findExistingLinkedinUrls(membership.organizationId, urls),
    },
    { step: startStep, seenKeys },
  );

  if (!result.ok) return { ok: false, error: result.error };

  const acumulado = isFresh
    ? result.results
    : mergeSourcingBatch(seedResults, result.results);

  // El recruiter puede haber navegado a otra subtab mientras esto corría (búsqueda + scorings de
  // IA tardan) — la sesión persistida le permite restaurar al volver, y la notificación le avisa.
  if (user) {
    try {
      await saveSourcingSession(membership.organizationId, jobId, user.id, {
        attempt: result.nextStep, // la columna `attempt` ahora guarda el cursor de paso
        results: acumulado,
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
          : `No encontramos candidatos nuevos para "${job.title}" — ${result.exhausted ? "ya recorrimos todo LinkedIn para esta búsqueda" : "probá con otra tanda"}`;
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
    results: acumulado,
    isLiveApi: result.isLiveApi,
    metrics: result.metrics,
    exhausted: result.exhausted,
  };
}

const scorearCandidatoSchema = z.object({
  jobId: z.string().uuid("ID de búsqueda inválido."),
  candidate: z.object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    headline: z.string(),
    location: z.string(),
    skills: z.array(z.string()),
    linkedinUrl: z.string().trim().min(1),
    snippet: z.string().nullable().optional(),
  }),
});

/**
 * Score post-hoc de un candidato puntual en Sourcing Manual (búsqueda libre, sin contexto de
 * job por default): el reclutador elige a qué búsqueda postular a un candidato encontrado y
 * eso dispara este análisis, de a uno — a diferencia de Sourcing con IA (que scorea toda la
 * tanda porque ya está atado a una búsqueda). El guardrail contra abuso (una vez por par
 * candidato+búsqueda, tope por tanda) vive en el cliente (`LinkedInSourcingTab.tsx`); esta
 * action solo valida auth y ejecuta un scoring puntual.
 */
export async function scorearCandidatoSourcingAction(input: {
  jobId: string;
  candidate: {
    id: string;
    name: string;
    headline: string;
    location: string;
    skills: string[];
    linkedinUrl: string;
    snippet?: string | null;
  };
}): Promise<{ ok: boolean; result?: ScoredLinkedInCandidate; error?: string }> {
  const parsed = scorearCandidatoSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };
  if (!can(membership.role, "candidates.manage")) {
    return { ok: false, error: "Tu rol no permite usar sourcing." };
  }

  const job = await getJobById(parsed.data.jobId, membership.organizationId);
  if (!job) return { ok: false, error: "Búsqueda no encontrada." };

  const provider = getAiProvider();
  const result = await scoreLinkedInCandidate(
    parsed.data.candidate,
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
    (i) => provider.scoreApplication(i),
  );

  return { ok: true, result };
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

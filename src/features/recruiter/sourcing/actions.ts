"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { insertCandidate } from "../candidates/data/candidates.mutations";
import {
  scoreLinkedInCandidate,
  sourcearParaBusqueda,
  type ScoredLinkedInCandidate,
} from "./domain/sourcear-para-busqueda";
import { getJobById } from "../jobs/data/jobs.queries";
import { getAiProvider } from "@/lib/ai";
import { can } from "@/lib/auth/roles";
import { notifyProfile } from "../notifications/data/notifications.mutations";

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
    source: "linkedin",
    phone: null,
  });

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

/**
 * Sourcing con IA de un clic desde Postulados (ítem 9.4): busca en LinkedIn usando el contexto
 * de la búsqueda (puesto, skills, seniority, ubicación), sin que el recruiter tipee nada, y
 * scorea cada resultado con IA — devuelve todos los que encuentra (sin filtrar por score),
 * ordenados de mayor a menor match, hasta 10.
 */
export async function sourcearParaBusquedaAction(jobId: string): Promise<{
  ok: boolean;
  results?: ScoredLinkedInCandidate[];
  isLiveApi?: boolean;
  error?: string;
}> {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!membership) return { ok: false, error: "No autorizado." };
  if (!can(membership.role, "candidates.manage")) {
    return { ok: false, error: "Tu rol no permite usar sourcing." };
  }

  const job = await getJobById(jobId, membership.organizationId);
  if (!job) return { ok: false, error: "Búsqueda no encontrada." };

  const { searchLinkedInCandidates } = await import("./domain/linkedin-search");
  const provider = getAiProvider();

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
      search: (query) => searchLinkedInCandidates({ query }),
      scoreApplication: (input) => provider.scoreApplication(input),
    },
  );

  if (!result.ok) return { ok: false, error: result.error };

  // El recruiter puede haber navegado a otra subtab mientras esto corría (el sourcing tarda:
  // búsqueda + hasta 10 scorings de IA) — si ya no está montado para ver `results`, esto es lo
  // único que le avisa que terminó. No persiste los resultados: si vuelve desde el link, tiene
  // que repetir la búsqueda.
  if (user) {
    try {
      await notifyProfile(membership.organizationId, user.id, {
        type: "background_job",
        title: `Terminó el sourcing con IA para "${job.title}"`,
        link: `/jobs/${jobId}/postulados`,
      });
    } catch {
      // no-op: el sourcing ya terminó, un fallo al notificar no debe hacer fallar la respuesta.
    }
  }

  return { ok: true, results: result.results, isLiveApi: result.isLiveApi };
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

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/session";
import { insertCandidate } from "../candidates/data/candidates.mutations";
import {
  buildBooleanQuery,
  generateSourcingResults,
  platformToSource,
  SOURCING_PLATFORMS,
  type SourcingResult,
} from "./domain/sourcing";
import {
  sourcearParaBusqueda,
  type ScoredLinkedInCandidate,
} from "./domain/sourcear-para-busqueda";
import { getJobById } from "../jobs/data/jobs.queries";
import { getAiProvider } from "@/lib/ai";
import { can } from "@/lib/auth/roles";

const querySchema = z.object({
  keywords: z.array(z.string()).max(10),
  location: z.string().nullable(),
  seniority: z.string().nullable(),
  platforms: z.array(z.enum(SOURCING_PLATFORMS)).max(4),
});

export async function buscarSourcingAction(input: {
  keywords: string[];
  location: string | null;
  seniority: string | null;
  platforms: string[];
}): Promise<{
  ok: boolean;
  boolean?: string;
  results?: SourcingResult[];
  error?: string;
}> {
  const parsed = querySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Query inválida." };

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const results = generateSourcingResults(parsed.data);
  return { ok: true, boolean: buildBooleanQuery(parsed.data), results };
}

const importSchema = z.object({
  name: z.string().trim().min(1),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  skills: z.array(z.string()),
  platform: z.enum(SOURCING_PLATFORMS),
  linkedinUrl: z.string().optional().nullable(),
});

export async function importarSourcingAction(result: {
  name: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  platform: string;
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
    source: platformToSource(parsed.data.platform),
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
 * scorea cada resultado con IA — solo devuelve los que matchean 60% o más, hasta 10.
 */
export async function sourcearParaBusquedaAction(jobId: string): Promise<{
  ok: boolean;
  results?: ScoredLinkedInCandidate[];
  isLiveApi?: boolean;
  error?: string;
}> {
  const membership = await getActiveMembership();
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
  return { ok: true, results: result.results, isLiveApi: result.isLiveApi };
}

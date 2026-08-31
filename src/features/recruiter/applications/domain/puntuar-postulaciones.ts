import type {
  AiProvider,
  ScoreBreakdown,
  CandidateExperienceInput,
  CandidateEducationInput,
} from "@/lib/ai";
import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

export type ScoringCandidate = {
  id: string;
  skills: string[] | null;
  summary: string | null;
  source: string | null;
  experience: CandidateExperienceInput[];
  education: CandidateEducationInput[];
};

export type PuntuarInput = {
  job: {
    title: string;
    position?: string | null;
    skills: string[] | null;
    objectives?: string | null;
    requirements?: string | null;
    responsibilities?: string | null;
  };
  applications: { id: string; candidate: ScoringCandidate }[];
};

export type PuntuarContext = {
  organizationId: string;
  role: OrgRole;
};

export type PuntuarDeps = {
  provider: AiProvider;
  saveScore: (
    applicationId: string,
    score: number,
    summary: string,
    redFlags: string[],
    breakdown: ScoreBreakdown,
    strengths: string[],
  ) => Promise<void>;
};

/**
 * Puntúa (con IA mock) las postulaciones de una búsqueda y persiste el resultado. La regla de
 * negocio que cuida es el rol; el cómo se calcula vive detrás de la interfaz AiProvider.
 */
export async function puntuarPostulaciones(
  input: PuntuarInput,
  ctx: PuntuarContext,
  deps: PuntuarDeps,
): Promise<{ ok: true; scored: number } | { ok: false; error: string }> {
  if (!can(ctx.role, "ai.use")) {
    return { ok: false, error: "Tu rol no permite usar el análisis con IA." };
  }

  if (input.applications.length === 0) return { ok: true, scored: 0 };

  // Una llamada (o unos pocos chunks) para todas las postulaciones, en vez de una por candidato.
  const batch = await deps.provider.scoreApplicationsBatch({
    job: input.job,
    candidates: input.applications.map((a) => a.candidate),
  });
  const scoreByCandidate = new Map(batch.map((r) => [r.candidateId, r]));

  let scored = 0;
  for (const app of input.applications) {
    const result = scoreByCandidate.get(app.candidate.id);
    if (!result) continue; // scoreApplicationsBatch siempre cubre todos; guard defensivo.
    await deps.saveScore(
      app.id,
      result.score,
      result.summary,
      result.redFlags,
      result.breakdown,
      result.strengths,
    );
    scored += 1;
  }

  return { ok: true, scored };
}

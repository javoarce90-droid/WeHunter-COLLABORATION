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

  let scored = 0;
  for (const app of input.applications) {
    const result = await deps.provider.scoreApplication({
      candidate: app.candidate,
      job: input.job,
    });
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

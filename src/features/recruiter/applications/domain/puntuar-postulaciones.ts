import type { AiProvider } from "@/lib/ai";

export type ScoringCandidate = {
  id: string;
  skills: string[] | null;
  summary: string | null;
  source: string | null;
  hasCv: boolean;
};

export type PuntuarInput = {
  job: { title: string; skills: string[] | null };
  applications: { id: string; candidate: ScoringCandidate }[];
};

export type PuntuarContext = {
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
};

export type PuntuarDeps = {
  provider: AiProvider;
  saveScore: (applicationId: string, score: number, summary: string) => Promise<void>;
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
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden analizar postulaciones." };
  }

  let scored = 0;
  for (const app of input.applications) {
    const result = await deps.provider.scoreApplication({
      candidate: app.candidate,
      job: input.job,
    });
    await deps.saveScore(app.id, result.score, result.summary);
    scored += 1;
  }

  return { ok: true, scored };
}

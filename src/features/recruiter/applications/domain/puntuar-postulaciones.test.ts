import { describe, it, expect, vi } from "vitest";
import { puntuarPostulaciones } from "./puntuar-postulaciones";
import type { PuntuarContext, PuntuarDeps } from "./puntuar-postulaciones";
import { MockAiProvider } from "@/lib/ai/mock";

const ctx: PuntuarContext = { organizationId: "org-1", role: "recruiter" };

const cand = (id: string, skills: string[] | null = null) => ({
  id,
  candidate: { id: `c-${id}`, skills, summary: null, source: null, hasCv: true },
});

const makeDeps = (over?: Partial<PuntuarDeps>): PuntuarDeps => ({
  provider: new MockAiProvider(),
  saveScore: vi.fn().mockResolvedValue(undefined),
  ...over,
});

describe("puntuarPostulaciones", () => {
  it("puntúa y persiste cada postulación", async () => {
    const deps = makeDeps();
    const res = await puntuarPostulaciones(
      {
        job: { title: "Backend", skills: ["node", "sql"] },
        applications: [cand("app-1", ["node", "sql"]), cand("app-2", ["php"])],
      },
      ctx,
      deps,
    );

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.scored).toBe(2);
    expect(deps.saveScore).toHaveBeenCalledTimes(2);
  });

  it("el score es determinístico y refleja el match (más skills → más score)", async () => {
    const scores: Record<string, number> = {};
    const deps = makeDeps({
      saveScore: vi.fn().mockImplementation((id, score) => {
        scores[id] = score;
        return Promise.resolve();
      }),
    });

    await puntuarPostulaciones(
      {
        job: { title: "Backend", skills: ["node", "sql"] },
        applications: [cand("full", ["node", "sql"]), cand("none", ["cobol"])],
      },
      ctx,
      deps,
    );

    expect(scores.full).toBeGreaterThan(scores.none);
  });

  it("rechaza al consultor sin puntuar", async () => {
    const deps = makeDeps();
    const res = await puntuarPostulaciones(
      { job: { title: "x", skills: null }, applications: [cand("a")] },
      { ...ctx, role: "consultant" },
      deps,
    );
    expect(res.ok).toBe(false);
    expect(deps.saveScore).not.toHaveBeenCalled();
  });
});

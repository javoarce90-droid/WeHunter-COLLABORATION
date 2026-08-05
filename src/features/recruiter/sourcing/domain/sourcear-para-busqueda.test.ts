import { describe, it, expect } from "vitest";
import {
  buildJobSourcingQuery,
  sourcearParaBusqueda,
  SOURCING_MAX_RESULTS,
  type JobSourcingContext,
} from "./sourcear-para-busqueda";
import type { LinkedInCandidateResult } from "./linkedin-search";

const job = (over: Partial<JobSourcingContext> = {}): JobSourcingContext => ({
  title: "Backend Engineer",
  position: "Senior Backend Engineer",
  skills: ["Python", "Supabase"],
  seniority: "senior",
  location: "Buenos Aires",
  ...over,
});

function candidate(over: Partial<LinkedInCandidateResult> = {}): LinkedInCandidateResult {
  return {
    id: "c1",
    name: "Ana Pérez",
    headline: "Backend Engineer",
    location: "Buenos Aires",
    skills: ["Python"],
    linkedinUrl: "https://www.linkedin.com/in/ana-perez",
    ...over,
  };
}

describe("buildJobSourcingQuery", () => {
  it("prioriza position sobre title y suma skills, seniority y location", () => {
    expect(buildJobSourcingQuery(job())).toBe(
      "Senior Backend Engineer Python Supabase senior Buenos Aires",
    );
  });

  it("usa title si no hay position", () => {
    expect(buildJobSourcingQuery(job({ position: null }))).toBe(
      "Backend Engineer Python Supabase senior Buenos Aires",
    );
  });

  it("ignora campos vacíos/null", () => {
    expect(
      buildJobSourcingQuery(job({ skills: null, seniority: null, location: null })),
    ).toBe("Senior Backend Engineer");
  });
});

describe("sourcearParaBusqueda", () => {
  it("no filtra por score: trae todos los candidatos encontrados", async () => {
    const candidates = [candidate({ id: "a" }), candidate({ id: "b" }), candidate({ id: "c" })];
    const scores: Record<string, number> = { a: 80, b: 40, c: 60 };
    const res = await sourcearParaBusqueda(job(), {
      search: async () => ({ candidates, isLiveApi: true }),
      scoreApplication: async (input) => ({
        score: scores[input.candidate.id]!,
        summary: "resumen",
        redFlags: [],
        breakdown: { experiencia: 0, skillsTecnicos: 0, seniority: 0, idiomas: 0, ubicacion: 0 },
        strengths: [],
      }),
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results.map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("ordena de mayor a menor score", async () => {
    const candidates = [candidate({ id: "a" }), candidate({ id: "b" }), candidate({ id: "c" })];
    const scores: Record<string, number> = { a: 65, b: 95, c: 70 };
    const res = await sourcearParaBusqueda(job(), {
      search: async () => ({ candidates, isLiveApi: false }),
      scoreApplication: async (input) => ({
        score: scores[input.candidate.id]!,
        summary: "",
        redFlags: [],
        breakdown: { experiencia: 0, skillsTecnicos: 0, seniority: 0, idiomas: 0, ubicacion: 0 },
        strengths: [],
      }),
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("corta en 10 resultados aunque vengan más", async () => {
    const candidates = Array.from({ length: 15 }, (_, i) => candidate({ id: `c${i}` }));
    const res = await sourcearParaBusqueda(job(), {
      search: async () => ({ candidates, isLiveApi: true }),
      scoreApplication: async () => ({
        score: 90,
        summary: "",
        redFlags: [],
        breakdown: { experiencia: 0, skillsTecnicos: 0, seniority: 0, idiomas: 0, ubicacion: 0 },
        strengths: [],
      }),
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results).toHaveLength(SOURCING_MAX_RESULTS);
  });

  it("propaga el error de la búsqueda", async () => {
    const res = await sourcearParaBusqueda(job(), {
      search: async () => ({ candidates: [], isLiveApi: false, error: "Falló la búsqueda." }),
      scoreApplication: async () => {
        throw new Error("no debería scorear si search falló");
      },
    });
    expect(res).toEqual({ ok: false, error: "Falló la búsqueda." });
  });
});

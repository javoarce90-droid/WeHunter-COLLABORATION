import { describe, it, expect } from "vitest";
import {
  jobToSourcingFilters,
  sourcearParaBusqueda,
  SOURCING_MAX_RESULTS,
  type JobSourcingContext,
  type SourcearParaBusquedaDeps,
} from "./sourcear-para-busqueda";
import type { SourcingProviderCandidate } from "./sourcing-provider";

const job = (over: Partial<JobSourcingContext> = {}): JobSourcingContext => ({
  title: "Backend Engineer",
  position: "Senior Backend Engineer",
  skills: ["Python", "Supabase"],
  seniority: "senior",
  location: "Buenos Aires",
  ...over,
});

function candidate(over: Partial<SourcingProviderCandidate> = {}): SourcingProviderCandidate {
  return {
    id: "c1",
    name: "Ana Pérez",
    headline: "Backend Engineer",
    location: "Buenos Aires",
    skills: ["Python"],
    linkedinUrl: "https://www.linkedin.com/in/ana-perez",
    email: null,
    snippet: null,
    experience: [],
    education: [],
    certifications: [],
    languages: [],
    ...over,
  };
}

/** Batch scorer de test: score fijo (90) o por id si se pasa un mapa. */
const batchScorer =
  (scores?: Record<string, number>): SourcearParaBusquedaDeps["scoreApplicationsBatch"] =>
  async ({ candidates }) =>
    candidates.map((c) => ({
      candidateId: c.id,
      score: scores?.[c.id] ?? 90,
      summary: "resumen",
      redFlags: [],
      breakdown: { experiencia: 0, skillsTecnicos: 0, seniority: 0, idiomas: 0, ubicacion: 0 },
      strengths: [],
    }));

/** Deps por default para `sourcearParaBusqueda`: nadie está en el pool todavía. Los tests que
 *  necesitan simular candidatos ya conocidos pasan su propio `findExistingCandidateKeys`. */
function deps(over: Partial<SourcearParaBusquedaDeps> = {}): SourcearParaBusquedaDeps {
  return {
    search: async () => ({ candidates: [], isLiveApi: true, costUsd: 0 }),
    scoreApplicationsBatch: batchScorer(),
    findExistingCandidateKeys: async () => ({ linkedinUrls: new Set(), emails: new Set() }),
    ...over,
  };
}

describe("jobToSourcingFilters", () => {
  it("prioriza position sobre title y arma role/skills/seniority/location", () => {
    expect(jobToSourcingFilters(job())).toEqual({
      role: "Senior Backend Engineer",
      skills: ["Python", "Supabase"],
      seniority: "senior",
      location: "Buenos Aires",
    });
  });

  it("usa title si no hay position", () => {
    expect(jobToSourcingFilters(job({ position: null })).role).toBe("Backend Engineer");
  });

  it("defaultea a Argentina cuando la búsqueda no tiene location cargada", () => {
    expect(jobToSourcingFilters(job({ location: null })).location).toBe("Argentina");
  });

  it("skills null se normaliza a array vacío", () => {
    expect(jobToSourcingFilters(job({ skills: null })).skills).toEqual([]);
  });
});

describe("sourcearParaBusqueda", () => {
  it("llama a deps.search una sola vez, con los filtros armados desde el job y el maxResults pedido", async () => {
    let calls = 0;
    let received: unknown;
    await sourcearParaBusqueda(
      job(),
      5,
      deps({
        search: async (filters, maxResults, exclude) => {
          calls += 1;
          received = { filters, maxResults, exclude };
          return { candidates: [], isLiveApi: true, costUsd: 0 };
        },
      }),
    );
    expect(calls).toBe(1);
    expect(received).toEqual({
      filters: {
        role: "Senior Backend Engineer",
        skills: ["Python", "Supabase"],
        seniority: "senior",
        location: "Buenos Aires",
      },
      maxResults: 5,
      exclude: [],
    });
  });

  it("no filtra por score: trae todos los candidatos encontrados", async () => {
    const candidates = [
      candidate({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" }),
      candidate({ id: "b", linkedinUrl: "https://www.linkedin.com/in/b" }),
      candidate({ id: "c", linkedinUrl: "https://www.linkedin.com/in/c" }),
    ];
    const scores: Record<string, number> = { a: 80, b: 40, c: 60 };
    const res = await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({
        search: async () => ({ candidates, isLiveApi: true, costUsd: 0 }),
        scoreApplicationsBatch: batchScorer(scores),
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results.map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("ordena de mayor a menor score", async () => {
    const candidates = [
      candidate({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" }),
      candidate({ id: "b", linkedinUrl: "https://www.linkedin.com/in/b" }),
      candidate({ id: "c", linkedinUrl: "https://www.linkedin.com/in/c" }),
    ];
    const scores: Record<string, number> = { a: 65, b: 95, c: 70 };
    const res = await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({
        search: async () => ({ candidates, isLiveApi: false, costUsd: 0 }),
        scoreApplicationsBatch: batchScorer(scores),
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("respeta el maxResults pedido por el reclutador, no siempre el tope global", async () => {
    const candidates = Array.from({ length: 15 }, (_, i) =>
      candidate({ id: `c${i}`, linkedinUrl: `https://www.linkedin.com/in/c${i}` }),
    );
    const res = await sourcearParaBusqueda(
      job(),
      3,
      deps({ search: async () => ({ candidates, isLiveApi: true, costUsd: 0 }) }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results).toHaveLength(3);
  });

  it("corta en SOURCING_MAX_RESULTS aunque vengan más y se pidan más", async () => {
    const candidates = Array.from({ length: 15 }, (_, i) =>
      candidate({ id: `c${i}`, linkedinUrl: `https://www.linkedin.com/in/c${i}` }),
    );
    const res = await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({ search: async () => ({ candidates, isLiveApi: true, costUsd: 0 }) }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results).toHaveLength(SOURCING_MAX_RESULTS);
  });

  it("propaga el error de la búsqueda", async () => {
    const res = await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({
        search: async () => ({
          candidates: [],
          isLiveApi: false,
          costUsd: 0,
          error: "Falló la búsqueda.",
        }),
        scoreApplicationsBatch: async () => {
          throw new Error("no debería scorear si search falló");
        },
      }),
    );
    expect(res).toEqual({ ok: false, error: "Falló la búsqueda." });
  });

  it("filtra candidatos ya en el pool y no les llama scoreApplication", async () => {
    const candidates = [
      candidate({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" }),
      candidate({ id: "b", linkedinUrl: "https://www.linkedin.com/in/b" }),
    ];
    const res = await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({
        search: async () => ({ candidates, isLiveApi: true, costUsd: 0 }),
        findExistingCandidateKeys: async () => ({
          linkedinUrls: new Set(["https://www.linkedin.com/in/a"]),
          emails: new Set(),
        }),
        scoreApplicationsBatch: async ({ candidates: cs }) => {
          if (cs.some((c) => c.id === "a"))
            throw new Error("no debería scorear a un ya conocido");
          return batchScorer()({ job: job(), candidates: cs });
        },
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results.map((r) => r.id)).toEqual(["b"]);
  });

  it("normaliza (trailing slash, mayúsculas) antes de comparar contra el pool", async () => {
    // El candidato trae la url "sucia" (como puede venir del proveedor); el pool ya la devuelve
    // normalizada (contrato de `findExistingCandidateKeys` real, ver candidates.queries.ts) —
    // igual tienen que matchear.
    const candidates = [candidate({ id: "a", linkedinUrl: "HTTPS://WWW.LINKEDIN.COM/IN/A/" })];
    const res = await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({
        search: async () => ({ candidates, isLiveApi: true, costUsd: 0 }),
        findExistingCandidateKeys: async () => ({
          linkedinUrls: new Set(["https://www.linkedin.com/in/a"]),
          emails: new Set(),
        }),
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results).toHaveLength(0);
  });

  it("filtra por email cuando el candidato no matchea por LinkedIn (regla 'Duplicados', HarvestAPI trae email real)", async () => {
    const candidates = [
      candidate({
        id: "a",
        linkedinUrl: "https://www.linkedin.com/in/otra-url",
        email: "ana@ejemplo.com",
      }),
    ];
    const res = await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({
        search: async () => ({ candidates, isLiveApi: true, costUsd: 0 }),
        findExistingCandidateKeys: async () => ({
          linkedinUrls: new Set(),
          emails: new Set(["ana@ejemplo.com"]),
        }),
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results).toHaveLength(0);
    expect(res.metrics).toEqual({ encontrados: 1, enPool: 1, nuevos: 0 });
  });

  it("devuelve métricas correctas de encontrados/enPool/nuevos", async () => {
    const candidates = [
      candidate({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" }),
      candidate({ id: "b", linkedinUrl: "https://www.linkedin.com/in/b" }),
      candidate({ id: "c", linkedinUrl: "https://www.linkedin.com/in/c" }),
      candidate({ id: "d", linkedinUrl: "https://www.linkedin.com/in/d" }),
      candidate({ id: "e", linkedinUrl: "https://www.linkedin.com/in/e" }),
    ];
    const res = await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({
        search: async () => ({ candidates, isLiveApi: true, costUsd: 0 }),
        findExistingCandidateKeys: async () => ({
          linkedinUrls: new Set([
            "https://www.linkedin.com/in/a",
            "https://www.linkedin.com/in/b",
          ]),
          emails: new Set(),
        }),
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.metrics).toEqual({ encontrados: 5, enPool: 2, nuevos: 3 });
    expect(res.results).toHaveLength(3);
  });

  it("no llama a findExistingCandidateKeys si la búsqueda no trae candidatos", async () => {
    let called = false;
    const res = await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({
        search: async () => ({ candidates: [], isLiveApi: true, costUsd: 0 }),
        findExistingCandidateKeys: async () => {
          called = true;
          return { linkedinUrls: new Set(), emails: new Set() };
        },
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(called).toBe(false);
    expect(res.metrics).toEqual({ encontrados: 0, enPool: 0, nuevos: 0 });
  });
});

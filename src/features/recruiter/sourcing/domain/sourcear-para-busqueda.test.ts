import { describe, it, expect } from "vitest";
import {
  buildJobSourcingQuery,
  buildJobSourcingQueryVariant,
  scoreLinkedInCandidate,
  sourcearParaBusqueda,
  mergeSourcingBatch,
  SOURCING_MAX_RESULTS,
  SOURCING_MAX_QUERY_ATTEMPTS,
  MAX_SEARCH_STEPS,
  type JobSourcingContext,
  type SourcearParaBusquedaDeps,
  type ScoredLinkedInCandidate,
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

const scoreOk = async () => ({
  score: 90,
  summary: "",
  redFlags: [],
  breakdown: { experiencia: 0, skillsTecnicos: 0, seniority: 0, idiomas: 0, ubicacion: 0 },
  strengths: [],
});

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
 *  necesitan simular candidatos ya conocidos pasan su propio `findExistingLinkedinUrls`. */
function deps(over: Partial<SourcearParaBusquedaDeps> = {}): SourcearParaBusquedaDeps {
  return {
    search: async () => ({ candidates: [], isLiveApi: true }),
    scoreApplication: scoreOk,
    scoreApplicationsBatch: batchScorer(),
    findExistingLinkedinUrls: async () => new Set(),
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

describe("scoreLinkedInCandidate", () => {
  it("arma el input de scoring con snippet como summary y devuelve el candidato enriquecido", async () => {
    const c = candidate({ snippet: "Backend con foco en Python y Supabase" });
    let received: unknown;
    const result = await scoreLinkedInCandidate(c, job(), async (input) => {
      received = input;
      return {
        score: 82,
        summary: "Buen match",
        redFlags: ["sin certificaciones"],
        breakdown: { experiencia: 80, skillsTecnicos: 90, seniority: 70, idiomas: 100, ubicacion: 100 },
        strengths: ["Python sólido"],
      };
    });

    expect(received).toEqual({
      candidate: {
        id: "c1",
        skills: ["Python"],
        summary: "Backend con foco en Python y Supabase",
        source: "linkedin",
        experience: [],
        education: [],
      },
      job: {
        title: "Backend Engineer",
        position: "Senior Backend Engineer",
        skills: ["Python", "Supabase"],
        objectives: undefined,
        requirements: undefined,
        responsibilities: undefined,
      },
    });
    expect(result).toEqual({
      ...c,
      score: 82,
      summary: "Buen match",
      redFlags: ["sin certificaciones"],
      breakdown: { experiencia: 80, skillsTecnicos: 90, seniority: 70, idiomas: 100, ubicacion: 100 },
      strengths: ["Python sólido"],
    });
  });

  it("usa el headline como summary cuando no hay snippet", async () => {
    const c = candidate({ snippet: null });
    let received: unknown;
    await scoreLinkedInCandidate(c, job(), async (input) => {
      received = input;
      return {
        score: 50,
        summary: "",
        redFlags: [],
        breakdown: { experiencia: 0, skillsTecnicos: 0, seniority: 0, idiomas: 0, ubicacion: 0 },
        strengths: [],
      };
    });
    expect((received as { candidate: { summary: string } }).candidate.summary).toBe(
      "Backend Engineer",
    );
  });
});

describe("sourcearParaBusqueda", () => {
  it("no filtra por score: trae todos los candidatos encontrados", async () => {
    const candidates = [
      candidate({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" }),
      candidate({ id: "b", linkedinUrl: "https://www.linkedin.com/in/b" }),
      candidate({ id: "c", linkedinUrl: "https://www.linkedin.com/in/c" }),
    ];
    const scores: Record<string, number> = { a: 80, b: 40, c: 60 };
    const res = await sourcearParaBusqueda(
      job(),
      deps({
        search: async () => ({ candidates, isLiveApi: true }),
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
      deps({
        search: async () => ({ candidates, isLiveApi: false }),
        scoreApplicationsBatch: batchScorer(scores),
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("corta en 10 resultados aunque vengan más", async () => {
    const candidates = Array.from({ length: 15 }, (_, i) =>
      candidate({ id: `c${i}`, linkedinUrl: `https://www.linkedin.com/in/c${i}` }),
    );
    const res = await sourcearParaBusqueda(
      job(),
      deps({ search: async () => ({ candidates, isLiveApi: true }) }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results).toHaveLength(SOURCING_MAX_RESULTS);
  });

  it("propaga el error de la búsqueda", async () => {
    const res = await sourcearParaBusqueda(
      job(),
      deps({
        search: async () => ({ candidates: [], isLiveApi: false, error: "Falló la búsqueda." }),
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
      deps({
        search: async () => ({ candidates, isLiveApi: true }),
        findExistingLinkedinUrls: async () => new Set(["https://www.linkedin.com/in/a"]),
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
    // El candidato trae la url "sucia" (como puede venir de Serper); el pool ya la devuelve
    // normalizada (contrato de `findExistingLinkedinUrls` real, ver candidates.queries.ts) —
    // igual tienen que matchear.
    const candidates = [
      candidate({ id: "a", linkedinUrl: "HTTPS://WWW.LINKEDIN.COM/IN/A/" }),
    ];
    const res = await sourcearParaBusqueda(
      job(),
      deps({
        search: async () => ({ candidates, isLiveApi: true }),
        findExistingLinkedinUrls: async () => new Set(["https://www.linkedin.com/in/a"]),
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results).toHaveLength(0);
  });

  it("devuelve métricas correctas de encontrados/enPool/nuevos", async () => {
    const candidates = [
      candidate({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" }),
      candidate({ id: "b", linkedinUrl: "https://www.linkedin.com/in/b" }),
      candidate({ id: "c", linkedinUrl: "https://www.linkedin.com/in/c" }),
      candidate({ id: "d", linkedinUrl: "https://www.linkedin.com/in/d" }),
      candidate({ id: "e", linkedinUrl: "https://www.linkedin.com/in/e" }),
    ];
    // Solo la primera llamada trae perfiles (búsqueda que se agota rápido); el loop recorre el
    // resto de los pasos sin encontrar nada nuevo.
    let firstCall = true;
    const res = await sourcearParaBusqueda(
      job(),
      deps({
        search: async () => {
          const out = { candidates: firstCall ? candidates : [], isLiveApi: true };
          firstCall = false;
          return out;
        },
        findExistingLinkedinUrls: async () =>
          new Set(["https://www.linkedin.com/in/a", "https://www.linkedin.com/in/b"]),
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.metrics).toEqual({ encontrados: 5, enPool: 2, nuevos: 3 });
    expect(res.results).toHaveLength(3);
  });

  it("no llama a findExistingLinkedinUrls si la búsqueda no trae candidatos", async () => {
    let called = false;
    const res = await sourcearParaBusqueda(
      job(),
      deps({
        search: async () => ({ candidates: [], isLiveApi: true }),
        findExistingLinkedinUrls: async () => {
          called = true;
          return new Set();
        },
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(called).toBe(false);
    expect(res.metrics).toEqual({ encontrados: 0, enPool: 0, nuevos: 0 });
  });

  it("pagina: si una página no alcanza 10 nuevos, pide más páginas hasta juntarlos", async () => {
    // Cada página trae 4 perfiles distintos; hacen falta 3 páginas para llegar a 10.
    const pageOf = (page: number) =>
      Array.from({ length: 4 }, (_, i) =>
        candidate({
          id: `p${page}-c${i}`,
          linkedinUrl: `https://www.linkedin.com/in/p${page}c${i}`,
        }),
      );
    const seen: number[] = [];
    const res = await sourcearParaBusqueda(
      job(),
      deps({
        search: async (_q, page) => {
          seen.push(page);
          return { candidates: pageOf(page), isLiveApi: true };
        },
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(seen).toEqual([1, 2, 3]); // pidió 3 páginas
    expect(res.results).toHaveLength(SOURCING_MAX_RESULTS); // 12 nuevos → recorta a 10
    expect(res.metrics.nuevos).toBe(12);
    expect(res.nextStep).toBe(3);
  });

  it("no repite perfiles ya mostrados (seenKeys del cursor)", async () => {
    const candidates = [
      candidate({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" }),
      candidate({ id: "b", linkedinUrl: "https://www.linkedin.com/in/b" }),
      candidate({ id: "c", linkedinUrl: "https://www.linkedin.com/in/c" }),
    ];
    let first = true;
    const res = await sourcearParaBusqueda(
      job(),
      deps({
        search: async () => {
          const out = { candidates: first ? candidates : [], isLiveApi: true };
          first = false;
          return out;
        },
      }),
      // "a" y "b" ya se mostraron en un click anterior.
      { step: 0, seenKeys: ["https://www.linkedin.com/in/a", "https://www.linkedin.com/in/b"] },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results.map((r) => r.id)).toEqual(["c"]);
    expect(res.metrics.nuevos).toBe(1);
  });

  it("exhausted=true cuando el cursor llega al último paso", async () => {
    const res = await sourcearParaBusqueda(
      job(),
      deps({ search: async () => ({ candidates: [], isLiveApi: true }) }),
      { step: MAX_SEARCH_STEPS - 1, seenKeys: [] },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.exhausted).toBe(true);
    expect(res.nextStep).toBe(MAX_SEARCH_STEPS);
  });
});

describe("buildJobSourcingQueryVariant", () => {
  it("el intento 0 es idéntico a buildJobSourcingQuery (regresión)", () => {
    expect(buildJobSourcingQueryVariant(job(), 0)).toBe(buildJobSourcingQuery(job()));
  });

  it("rota al siguiente bloque de skills en el intento 1 cuando hay más de 3", () => {
    const j = job({ skills: ["Python", "Supabase", "AWS", "Docker", "Kubernetes", "Go"] });
    expect(buildJobSourcingQueryVariant(j, 0)).toBe(
      "Senior Backend Engineer Python Supabase AWS senior Buenos Aires",
    );
    expect(buildJobSourcingQueryVariant(j, 1)).toBe(
      "Senior Backend Engineer Docker Kubernetes Go senior Buenos Aires",
    );
  });

  it("con 3 skills o menos, el intento 1 no repite el intento 0 — cae a dropear seniority", () => {
    const j = job({ skills: ["Python", "Supabase"] });
    const variant0 = buildJobSourcingQueryVariant(j, 0);
    const variant1 = buildJobSourcingQueryVariant(j, 1);
    expect(variant1).not.toBe(variant0);
    expect(variant1).not.toContain("senior");
    expect(variant1).toContain("Buenos Aires");
    expect(variant1).not.toContain("undefined");
  });

  it("dropea seniority en el intento 2", () => {
    const result = buildJobSourcingQueryVariant(job(), 2);
    expect(result).not.toContain("senior");
    expect(result).toContain("Buenos Aires");
  });

  it("dropea seniority y location en el intento 3", () => {
    const result = buildJobSourcingQueryVariant(job(), 3);
    expect(result).not.toContain("senior");
    expect(result).not.toContain("Buenos Aires");
  });

  it("clampa intentos fuera de rango a la variante más amplia", () => {
    expect(buildJobSourcingQueryVariant(job(), 99)).toBe(
      buildJobSourcingQueryVariant(job(), SOURCING_MAX_QUERY_ATTEMPTS - 1),
    );
  });

  it("el puesto nunca desaparece, para ningún intento", () => {
    for (let attempt = 0; attempt < SOURCING_MAX_QUERY_ATTEMPTS; attempt++) {
      expect(buildJobSourcingQueryVariant(job(), attempt)).toContain("Senior Backend Engineer");
    }
  });
});

function scored(over: Partial<ScoredLinkedInCandidate> = {}): ScoredLinkedInCandidate {
  return {
    ...candidate(),
    score: 80,
    summary: "resumen",
    breakdown: { experiencia: 0, skillsTecnicos: 0, seniority: 0, idiomas: 0, ubicacion: 0 },
    strengths: [],
    redFlags: [],
    ...over,
  };
}

describe("mergeSourcingBatch", () => {
  it("no duplica por linkedinUrl cuando la tanda nueva repite un candidato ya visto", () => {
    const previous = [scored({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" })];
    const incoming = [
      scored({ id: "a-otra-vez", linkedinUrl: "https://www.linkedin.com/in/a" }),
      scored({ id: "b", linkedinUrl: "https://www.linkedin.com/in/b" }),
    ];
    const merged = mergeSourcingBatch(previous, incoming);
    expect(merged.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("cae a comparar por id cuando no hay linkedinUrl en ninguno de los dos lados", () => {
    const previous = [scored({ id: "a", linkedinUrl: "" })];
    const incoming = [scored({ id: "a", linkedinUrl: "" }), scored({ id: "b", linkedinUrl: "" })];
    const merged = mergeSourcingBatch(previous, incoming);
    expect(merged.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("agrega los genuinamente nuevos preservando el orden: previous primero", () => {
    const previous = [scored({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" })];
    const incoming = [
      scored({ id: "b", linkedinUrl: "https://www.linkedin.com/in/b" }),
      scored({ id: "c", linkedinUrl: "https://www.linkedin.com/in/c" }),
    ];
    expect(mergeSourcingBatch(previous, incoming).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("previous vacío devuelve incoming tal cual", () => {
    const incoming = [scored({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" })];
    expect(mergeSourcingBatch([], incoming)).toEqual(incoming);
  });

  it("incoming vacío devuelve previous sin cambios", () => {
    const previous = [scored({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" })];
    expect(mergeSourcingBatch(previous, [])).toEqual(previous);
  });
});

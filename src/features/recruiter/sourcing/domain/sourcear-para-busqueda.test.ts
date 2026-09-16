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
    search: async () => ({ candidates: [], isLiveApi: true, costUsd: 0, provider: "harvestapi" }),
    scoreApplicationsBatch: batchScorer(),
    findExistingCandidateKeys: async () => ({ linkedinUrls: new Set(), emails: new Set() }),
    recordConsumption: async () => {},
    findCachedProfile: async () => null,
    cacheProfile: async () => {},
    ...over,
  };
}

describe("jobToSourcingFilters", () => {
  it("usa title (no position) y arma role/skills/seniority/location", () => {
    // `role` alimenta la query de los proveedores de búsqueda — `title` (nombre de la
    // publicación) matchea mejor cómo la gente escribe su puesto en LinkedIn que `position`,
    // que puede tener redacción libre (ej. "Backend Engineer Senior", orden invertido).
    // Confirmado como causa real de 0 resultados en una búsqueda real (2026-09-15). `position`
    // sigue siendo el rol canónico para el scoring de IA (`jobToScoreJob`), que no pasa por acá.
    expect(jobToSourcingFilters(job())).toEqual({
      role: "Backend Engineer",
      skills: ["Python", "Supabase"],
      seniority: "senior",
      location: "Buenos Aires",
    });
  });

  it("ignora position aunque esté cargado — role siempre sale de title", () => {
    expect(jobToSourcingFilters(job({ position: "Otro título distinto" })).role).toBe(
      "Backend Engineer",
    );
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
          return { candidates: [], isLiveApi: true, costUsd: 0, provider: "harvestapi" };
        },
      }),
    );
    expect(calls).toBe(1);
    expect(received).toEqual({
      filters: {
        role: "Backend Engineer",
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
        search: async () => ({ candidates, isLiveApi: true, costUsd: 0, provider: "harvestapi" }),
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
        search: async () => ({ candidates, isLiveApi: false, costUsd: 0, provider: "harvestapi" }),
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
      deps({ search: async () => ({ candidates, isLiveApi: true, costUsd: 0, provider: "harvestapi" }) }),
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
      deps({ search: async () => ({ candidates, isLiveApi: true, costUsd: 0, provider: "harvestapi" }) }),
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
          provider: "harvestapi",
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
        search: async () => ({ candidates, isLiveApi: true, costUsd: 0, provider: "harvestapi" }),
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
        search: async () => ({ candidates, isLiveApi: true, costUsd: 0, provider: "harvestapi" }),
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
        search: async () => ({ candidates, isLiveApi: true, costUsd: 0, provider: "harvestapi" }),
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
        search: async () => ({ candidates, isLiveApi: true, costUsd: 0, provider: "harvestapi" }),
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
        search: async () => ({ candidates: [], isLiveApi: true, costUsd: 0, provider: "harvestapi" }),
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

describe("sourcearParaBusqueda — eventos de consumo", () => {
  it("emite NEW_PROFILE por cada candidato nuevo, con el costo prorrateado", async () => {
    const candidates = [
      candidate({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" }),
      candidate({ id: "b", linkedinUrl: "https://www.linkedin.com/in/b" }),
    ];
    const events: unknown[] = [];
    const res = await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({
        search: async () => ({ candidates, isLiveApi: true, costUsd: 0.108, provider: "harvestapi" }),
        recordConsumption: async (e) => {
          events.push(e);
        },
      }),
    );
    expect(res.ok).toBe(true);
    expect(events).toEqual([
      { candidateKey: "https://www.linkedin.com/in/a", type: "NEW_PROFILE", costUsd: 0.054, provider: "harvestapi" },
      { candidateKey: "https://www.linkedin.com/in/b", type: "NEW_PROFILE", costUsd: 0.054, provider: "harvestapi" },
    ]);
  });

  it("emite DUPLICATE para un candidato que ya está en el Talent Pool, con el mismo costo prorrateado que uno nuevo", async () => {
    const candidates = [
      candidate({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" }),
      candidate({ id: "b", linkedinUrl: "https://www.linkedin.com/in/b" }),
    ];
    const events: unknown[] = [];
    const res = await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({
        search: async () => ({ candidates, isLiveApi: true, costUsd: 0.108, provider: "harvestapi" }),
        findExistingCandidateKeys: async () => ({
          linkedinUrls: new Set(["https://www.linkedin.com/in/a"]),
          emails: new Set(),
        }),
        recordConsumption: async (e) => {
          events.push(e);
        },
      }),
    );
    expect(res.ok).toBe(true);
    expect(events).toEqual([
      { candidateKey: "https://www.linkedin.com/in/a", type: "DUPLICATE", costUsd: 0.054, provider: "harvestapi" },
      { candidateKey: "https://www.linkedin.com/in/b", type: "NEW_PROFILE", costUsd: 0.054, provider: "harvestapi" },
    ]);
  });

  it("emite un único FAILED (candidateKey '(search)') cuando la búsqueda entera falla, sin costo", async () => {
    const events: unknown[] = [];
    const res = await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({
        search: async () => ({
          candidates: [],
          isLiveApi: false,
          costUsd: 0,
          provider: "harvestapi",
          error: "Falló la búsqueda.",
        }),
        recordConsumption: async (e) => {
          events.push(e);
        },
      }),
    );
    expect(res).toEqual({ ok: false, error: "Falló la búsqueda." });
    expect(events).toEqual([{ candidateKey: "(search)", type: "FAILED", costUsd: 0, provider: "harvestapi" }]);
  });

  it("no emite ningún evento si la búsqueda no devuelve candidatos", async () => {
    const events: unknown[] = [];
    await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({
        search: async () => ({ candidates: [], isLiveApi: true, costUsd: 0.1, provider: "harvestapi" }),
        recordConsumption: async (e) => {
          events.push(e);
        },
      }),
    );
    expect(events).toEqual([]);
  });

  it("emite REUSED_PROFILE (no NEW_PROFILE) cuando el perfil ya estaba cacheado y no es un duplicado del pool", async () => {
    const candidates = [
      candidate({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" }),
      candidate({ id: "b", linkedinUrl: "https://www.linkedin.com/in/b" }),
    ];
    const events: unknown[] = [];
    const res = await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({
        search: async () => ({ candidates, isLiveApi: true, costUsd: 0.108, provider: "harvestapi" }),
        findCachedProfile: async (linkedinUrl) =>
          linkedinUrl === "https://www.linkedin.com/in/a" ? candidates[0]! : null,
        recordConsumption: async (e) => {
          events.push(e);
        },
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // sigue mostrándose como resultado — REUSED_PROFILE solo afecta el cobro, no la visibilidad.
    expect(res.results.map((r) => r.id).sort()).toEqual(["a", "b"]);
    expect(events).toEqual([
      { candidateKey: "https://www.linkedin.com/in/a", type: "REUSED_PROFILE", costUsd: 0.054, provider: "harvestapi" },
      { candidateKey: "https://www.linkedin.com/in/b", type: "NEW_PROFILE", costUsd: 0.054, provider: "harvestapi" },
    ]);
  });

  it("un duplicado del Talent Pool nunca consulta la caché — el evento es DUPLICATE, no REUSED_PROFILE", async () => {
    const candidates = [candidate({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" })];
    const cacheChecks: string[] = [];
    const events: unknown[] = [];
    await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({
        search: async () => ({ candidates, isLiveApi: true, costUsd: 0.104, provider: "harvestapi" }),
        findExistingCandidateKeys: async () => ({
          linkedinUrls: new Set(["https://www.linkedin.com/in/a"]),
          emails: new Set(),
        }),
        findCachedProfile: async (linkedinUrl) => {
          cacheChecks.push(linkedinUrl);
          return null;
        },
        recordConsumption: async (e) => {
          events.push(e);
        },
      }),
    );
    expect(cacheChecks).toEqual([]);
    expect(events).toEqual([
      { candidateKey: "https://www.linkedin.com/in/a", type: "DUPLICATE", costUsd: 0.104, provider: "harvestapi" },
    ]);
  });

  it("cachea cada candidato nuevo procesado (sea NEW_PROFILE o REUSED_PROFILE), no los duplicados del pool", async () => {
    const candidates = [
      candidate({ id: "a", linkedinUrl: "https://www.linkedin.com/in/a" }),
      candidate({ id: "b", linkedinUrl: "https://www.linkedin.com/in/b" }),
    ];
    const cached: string[] = [];
    await sourcearParaBusqueda(
      job(),
      SOURCING_MAX_RESULTS,
      deps({
        search: async () => ({ candidates, isLiveApi: true, costUsd: 0.108, provider: "harvestapi" }),
        findExistingCandidateKeys: async () => ({
          linkedinUrls: new Set(["https://www.linkedin.com/in/a"]),
          emails: new Set(),
        }),
        cacheProfile: async (c) => {
          cached.push(c.linkedinUrl);
        },
      }),
    );
    expect(cached).toEqual(["https://www.linkedin.com/in/b"]);
  });
});

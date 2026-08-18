import { describe, it, expect, vi } from "vitest";
import {
  matchearPoolConBusqueda,
  POOL_MATCH_MAX_CANDIDATES,
  type PoolMatchCandidateInput,
  type PoolMatchCache,
  type PoolMatchCachedEntry,
} from "./matchear-pool-interno";
import type { AiProvider, ScoreApplicationResult } from "@/lib/ai";

const JOB_UPDATED_AT = new Date("2026-08-01T00:00:00Z");
const CANDIDATE_UPDATED_AT = new Date("2026-07-01T00:00:00Z");

const job = {
  id: "job-1",
  updatedAt: JOB_UPDATED_AT,
  title: "Frontend Senior",
  position: "Frontend Senior",
  skills: ["react"],
};

function candidato(id: string, updatedAt: Date = CANDIDATE_UPDATED_AT): PoolMatchCandidateInput {
  return {
    id,
    fullName: `Candidato ${id}`,
    headline: "Frontend @ Acme",
    completeness: { percent: 80, faltantes: [] },
    updatedAt,
    candidate: { id, skills: ["react"], summary: null, source: null, experience: [], education: [] },
  };
}

function providerWithScores(scores: Record<string, number>): Pick<AiProvider, "scoreApplication"> {
  return {
    scoreApplication: vi.fn(async (input): Promise<ScoreApplicationResult> => ({
      score: scores[input.candidate.id] ?? 0,
      summary: "",
      redFlags: [],
      breakdown: { experiencia: 0, skillsTecnicos: 0, seniority: 0, idiomas: 0, ubicacion: 0 },
      strengths: [],
    })),
  };
}

/** Doble en memoria del caché — respeta el mismo contrato que la implementación real de
 *  pool-match-cache.queries/mutations.ts, sin tocar la base. */
function emptyCache(): PoolMatchCache {
  return {
    getCached: vi.fn(async () => new Map()),
    save: vi.fn(async () => {}),
  };
}

function cacheWith(entries: Record<string, PoolMatchCachedEntry>): PoolMatchCache {
  return {
    getCached: vi.fn(async () => new Map(Object.entries(entries))),
    save: vi.fn(async () => {}),
  };
}

describe("matchearPoolConBusqueda", () => {
  it("ordena los resultados por score descendente", async () => {
    const provider = providerWithScores({ "1": 40, "2": 90, "3": 60 });
    const results = await matchearPoolConBusqueda(
      job,
      [candidato("1"), candidato("2"), candidato("3")],
      provider,
      emptyCache(),
    );
    expect(results.map((r) => r.candidateId)).toEqual(["2", "3", "1"]);
  });

  it("nunca scorea más de POOL_MATCH_MAX_CANDIDATES aunque le pasen más", async () => {
    const many = Array.from({ length: POOL_MATCH_MAX_CANDIDATES + 5 }, (_, i) =>
      candidato(String(i)),
    );
    const provider = providerWithScores({});
    const results = await matchearPoolConBusqueda(job, many, provider, emptyCache());
    expect(provider.scoreApplication).toHaveBeenCalledTimes(POOL_MATCH_MAX_CANDIDATES);
    expect(results).toHaveLength(POOL_MATCH_MAX_CANDIDATES);
  });

  it("reusa un resultado cacheado vigente sin llamar a la IA", async () => {
    const provider = providerWithScores({ "2": 90 });
    const cache = cacheWith({
      "1": {
        score: 55,
        summary: "cacheado",
        breakdown: { experiencia: 0, skillsTecnicos: 0, seniority: 0, idiomas: 0, ubicacion: 0 },
        strengths: [],
        redFlags: [],
        jobUpdatedAt: JOB_UPDATED_AT,
        candidateUpdatedAt: CANDIDATE_UPDATED_AT,
      },
    });
    const results = await matchearPoolConBusqueda(
      job,
      [candidato("1"), candidato("2")],
      provider,
      cache,
    );

    expect(provider.scoreApplication).toHaveBeenCalledTimes(1);
    expect(provider.scoreApplication).not.toHaveBeenCalledWith(
      expect.objectContaining({ candidate: expect.objectContaining({ id: "1" }) }),
    );
    const cacheado = results.find((r) => r.candidateId === "1");
    expect(cacheado).toMatchObject({ score: 55, summary: "cacheado", cached: true });
    const fresco = results.find((r) => r.candidateId === "2");
    expect(fresco).toMatchObject({ score: 90, cached: false });
  });

  it("re-scorea si el candidato cambió desde que se cacheó el resultado", async () => {
    const provider = providerWithScores({ "1": 70 });
    const cache = cacheWith({
      "1": {
        score: 55,
        summary: "viejo",
        breakdown: { experiencia: 0, skillsTecnicos: 0, seniority: 0, idiomas: 0, ubicacion: 0 },
        strengths: [],
        redFlags: [],
        jobUpdatedAt: JOB_UPDATED_AT,
        candidateUpdatedAt: new Date("2026-06-01T00:00:00Z"), // más viejo que el candidato actual
      },
    });
    const results = await matchearPoolConBusqueda(job, [candidato("1")], provider, cache);

    expect(provider.scoreApplication).toHaveBeenCalledTimes(1);
    expect(results[0]).toMatchObject({ score: 70, cached: false });
  });

  it("re-scorea si la búsqueda cambió desde que se cacheó el resultado", async () => {
    const provider = providerWithScores({ "1": 70 });
    const cache = cacheWith({
      "1": {
        score: 55,
        summary: "viejo",
        breakdown: { experiencia: 0, skillsTecnicos: 0, seniority: 0, idiomas: 0, ubicacion: 0 },
        strengths: [],
        redFlags: [],
        jobUpdatedAt: new Date("2026-01-01T00:00:00Z"), // más vieja que la búsqueda actual
        candidateUpdatedAt: CANDIDATE_UPDATED_AT,
      },
    });
    const results = await matchearPoolConBusqueda(job, [candidato("1")], provider, cache);

    expect(provider.scoreApplication).toHaveBeenCalledTimes(1);
    expect(results[0]).toMatchObject({ score: 70, cached: false });
  });

  it("persiste solo los resultados recién scoreados, no los que vinieron del caché", async () => {
    const provider = providerWithScores({ "2": 90 });
    const cache = cacheWith({
      "1": {
        score: 55,
        summary: "cacheado",
        breakdown: { experiencia: 0, skillsTecnicos: 0, seniority: 0, idiomas: 0, ubicacion: 0 },
        strengths: [],
        redFlags: [],
        jobUpdatedAt: JOB_UPDATED_AT,
        candidateUpdatedAt: CANDIDATE_UPDATED_AT,
      },
    });
    await matchearPoolConBusqueda(job, [candidato("1"), candidato("2")], provider, cache);

    expect(cache.save).toHaveBeenCalledTimes(1);
    expect(cache.save).toHaveBeenCalledWith(
      job.id,
      job.updatedAt,
      [expect.objectContaining({ candidateId: "2", score: 90 })],
    );
  });

  it("no llama a cache.save si todos los resultados vinieron del caché", async () => {
    const provider = providerWithScores({});
    const cache = cacheWith({
      "1": {
        score: 55,
        summary: "cacheado",
        breakdown: { experiencia: 0, skillsTecnicos: 0, seniority: 0, idiomas: 0, ubicacion: 0 },
        strengths: [],
        redFlags: [],
        jobUpdatedAt: JOB_UPDATED_AT,
        candidateUpdatedAt: CANDIDATE_UPDATED_AT,
      },
    });
    await matchearPoolConBusqueda(job, [candidato("1")], provider, cache);

    expect(provider.scoreApplication).not.toHaveBeenCalled();
    expect(cache.save).not.toHaveBeenCalled();
  });
});

import { describe, it, expect } from "vitest";
import { matchRecommendation, LOW_COMPLETENESS_THRESHOLD } from "./MatchCell";

describe("matchRecommendation", () => {
  it("deriva de la banda de score cuando no hay salvaguardas", () => {
    expect(matchRecommendation(90)).toBe("avanzar");
    expect(matchRecommendation(60)).toBe("revisar");
    expect(matchRecommendation(30)).toBe("descartar");
  });

  it("un match bajo con perfil incompleto NO se recomienda descartar", () => {
    expect(matchRecommendation(30, { completeness: 20 })).toBe("insuficiente");
    expect(
      matchRecommendation(30, { completeness: LOW_COMPLETENESS_THRESHOLD - 1 }),
    ).toBe("insuficiente");
  });

  it("con el perfil suficientemente completo, un match bajo sí es descartar", () => {
    expect(matchRecommendation(30, { completeness: 70 })).toBe("descartar");
    expect(
      matchRecommendation(30, { completeness: LOW_COMPLETENESS_THRESHOLD }),
    ).toBe("descartar");
  });

  it("un score degradado (heurístico) nunca recomienda descartar", () => {
    expect(matchRecommendation(30, { degraded: true })).toBe("insuficiente");
    expect(matchRecommendation(30, { degraded: true, completeness: 90 })).toBe(
      "insuficiente",
    );
  });

  it("las salvaguardas solo afectan a la banda 'descartar', no a las demás", () => {
    expect(matchRecommendation(90, { completeness: 5, degraded: true })).toBe("avanzar");
    expect(matchRecommendation(60, { completeness: 5, degraded: true })).toBe("revisar");
  });

  it("sin completeness (candidato externo / sourcing) se comporta como antes", () => {
    expect(matchRecommendation(30, {})).toBe("descartar");
    expect(matchRecommendation(30)).toBe("descartar");
  });
});

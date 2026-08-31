import { describe, it, expect, vi } from "vitest";
import {
  reconcileBatchScores,
  BATCH_RECONCILE_INDIVIDUAL_MAX,
  type ReconcileScorers,
} from "./batch-reconcile";
import type { ScoreApplicationInput, ScoreApplicationResult } from "./provider";

const candidate = (id: string): ScoreApplicationInput["candidate"] => ({
  id,
  skills: null,
  summary: null,
  source: null,
  experience: [],
  education: [],
});

const result = (
  score: number,
  degraded = false,
): ScoreApplicationResult => ({
  score,
  summary: `score ${score}`,
  redFlags: [],
  breakdown: { experiencia: 0, skillsTecnicos: 0, seniority: 0, idiomas: 0, ubicacion: 0 },
  strengths: [],
  degraded,
});

function scorers(over: Partial<ReconcileScorers> = {}): ReconcileScorers {
  return {
    scoreWithAi: vi.fn(async () => result(70)),
    scoreHeuristic: vi.fn(async () => result(50, true)),
    ...over,
  };
}

describe("reconcileBatchScores", () => {
  it("cuando el modelo cubrió a todos, no llama a ningún scorer y respeta el orden pedido", async () => {
    const cands = [candidate("a"), candidate("b"), candidate("c")];
    const fromModel = new Map([
      ["a", result(80)],
      ["b", result(40)],
      ["c", result(60)],
    ]);
    const s = scorers();

    const out = await reconcileBatchScores(cands, fromModel, s);

    expect(out.map((r) => r.candidateId)).toEqual(["a", "b", "c"]);
    expect(out.map((r) => r.score)).toEqual([80, 40, 60]);
    expect(s.scoreWithAi).not.toHaveBeenCalled();
    expect(s.scoreHeuristic).not.toHaveBeenCalled();
  });

  it("con pocos faltantes (<= umbral) rescorea individual con IA real", async () => {
    const cands = [candidate("a"), candidate("b"), candidate("c")];
    const fromModel = new Map([["a", result(80)]]); // faltan b y c (2 <= 3)
    const s = scorers();

    const out = await reconcileBatchScores(cands, fromModel, s);

    expect(s.scoreWithAi).toHaveBeenCalledTimes(2);
    expect(s.scoreHeuristic).not.toHaveBeenCalled();
    const byId = new Map(out.map((r) => [r.candidateId, r]));
    expect(byId.get("a")!.score).toBe(80);
    expect(byId.get("b")).toMatchObject({ score: 70, degraded: false });
    expect(byId.get("c")).toMatchObject({ score: 70, degraded: false });
  });

  it("con muchos faltantes (> umbral) rellena con el heurístico local", async () => {
    const cands = Array.from({ length: BATCH_RECONCILE_INDIVIDUAL_MAX + 2 }, (_, i) =>
      candidate(`c${i}`),
    );
    const fromModel = new Map<string, ScoreApplicationResult>(); // el modelo no devolvió nada
    const s = scorers();

    const out = await reconcileBatchScores(cands, fromModel, s);

    expect(s.scoreHeuristic).toHaveBeenCalledTimes(cands.length);
    expect(s.scoreWithAi).not.toHaveBeenCalled();
    expect(out.every((r) => r.degraded === true && r.score === 50)).toBe(true);
  });

  it("justo en el umbral usa IA; uno más ya cae al heurístico", async () => {
    const enUmbral = Array.from({ length: BATCH_RECONCILE_INDIVIDUAL_MAX }, (_, i) =>
      candidate(`u${i}`),
    );
    const sA = scorers();
    await reconcileBatchScores(enUmbral, new Map(), sA);
    expect(sA.scoreWithAi).toHaveBeenCalledTimes(BATCH_RECONCILE_INDIVIDUAL_MAX);

    const sobreUmbral = [...enUmbral, candidate("extra")];
    const sB = scorers();
    await reconcileBatchScores(sobreUmbral, new Map(), sB);
    expect(sB.scoreHeuristic).toHaveBeenCalledTimes(BATCH_RECONCILE_INDIVIDUAL_MAX + 1);
  });

  it("ignora ids que el modelo devolvió pero no estaban pedidos", async () => {
    const cands = [candidate("a")];
    const fromModel = new Map([
      ["a", result(80)],
      ["fantasma", result(99)],
    ]);
    const s = scorers();

    const out = await reconcileBatchScores(cands, fromModel, s);

    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ candidateId: "a", score: 80 });
  });

  it("preserva el orden pedido aunque el modelo devuelva salteado", async () => {
    const cands = [candidate("a"), candidate("b"), candidate("c"), candidate("d")];
    const fromModel = new Map([
      ["c", result(30)],
      ["a", result(90)],
    ]); // faltan b y d (2 <= 3 → IA)
    const out = await reconcileBatchScores(cands, fromModel, scorers());
    expect(out.map((r) => r.candidateId)).toEqual(["a", "b", "c", "d"]);
  });
});

import type {
  ScoreApplicationInput,
  ScoreApplicationResult,
  ScoredCandidate,
} from "./provider";

/**
 * `scoreApplicationsBatch` manda N candidatos en una request y el modelo devuelve un array.
 * Casi siempre vuelven los N, pero a veces (sobre todo con chunks grandes) el modelo omite
 * alguno o devuelve un objeto con forma inservible. La interfaz `AiProvider` promete UN
 * resultado por cada candidato pedido, así que a los faltantes hay que resolverlos.
 *
 * Estrategia (umbral): pocos faltantes → se rescorean individualmente con IA real (cada
 * `scoreApplication` trae su propia cascada de modelos + degradación); muchos faltantes → la
 * request de lote básicamente no sirvió y disparar N requests sale caro, así que se rellena
 * con el heurístico local (marcado `degraded`).
 */

/** Hasta esta cantidad de faltantes se rescorea individual con IA; por encima, heurístico. */
export const BATCH_RECONCILE_INDIVIDUAL_MAX = 3;

export type ReconcileScorers = {
  /** IA real, una llamada por candidato. */
  scoreWithAi: (
    candidate: ScoreApplicationInput["candidate"],
  ) => Promise<ScoreApplicationResult>;
  /** Heurístico local determinístico (sin red). Marca `degraded: true`. */
  scoreHeuristic: (
    candidate: ScoreApplicationInput["candidate"],
  ) => Promise<ScoreApplicationResult>;
};

/**
 * Empareja lo que devolvió el modelo (`fromModel`, por candidateId) con la lista pedida y
 * completa a los faltantes. Devuelve exactamente un `ScoredCandidate` por cada candidato de
 * `candidates`, en ese mismo orden.
 */
export async function reconcileBatchScores(
  candidates: ScoreApplicationInput["candidate"][],
  fromModel: Map<string, ScoreApplicationResult>,
  scorers: ReconcileScorers,
): Promise<ScoredCandidate[]> {
  const missing = candidates.filter((c) => !fromModel.has(c.id));

  const fill =
    missing.length > 0 && missing.length <= BATCH_RECONCILE_INDIVIDUAL_MAX
      ? scorers.scoreWithAi
      : scorers.scoreHeuristic;

  const filled = new Map<string, ScoreApplicationResult>(
    await Promise.all(
      missing.map(async (c) => [c.id, await fill(c)] as const),
    ),
  );

  return candidates.map((c) => {
    // `fromModel` primero (IA real, `degraded: false`); si no, lo que resolvió `fill`.
    const result = fromModel.get(c.id) ?? filled.get(c.id)!;
    return { candidateId: c.id, ...result };
  });
}

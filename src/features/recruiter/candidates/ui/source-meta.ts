import type { CandidateSource } from "../domain/candidate-details";

/** Etiquetas en español de la fuente del candidato. Compartidas por el form y la ficha. */
export const CANDIDATE_SOURCE_LABELS: Record<CandidateSource, string> = {
  manual: "Manual",
  linkedin: "LinkedIn",
  referral: "Referido",
  job_board: "Portal de empleo",
  other: "Otro",
};

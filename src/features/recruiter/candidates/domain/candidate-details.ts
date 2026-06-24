/**
 * Campos enriquecidos del candidato (paridad demo), compartidos entre cargar y editar.
 * El input llega validado por Zod; acá normalizamos undefined/vacío → null para la capa data.
 */

export type CandidateSource =
  | "manual"
  | "linkedin"
  | "referral"
  | "job_board"
  | "other";

export interface CandidateDetailsInput {
  headline?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  summary?: string | null;
  skills?: string[] | null;
  source?: CandidateSource | null;
}

export interface CandidateDetails {
  headline: string | null;
  location: string | null;
  linkedinUrl: string | null;
  summary: string | null;
  skills: string[] | null;
  source: CandidateSource | null;
}

const clean = (s?: string | null) => (s?.trim() ? s.trim() : null);

export function normalizeCandidateDetails(input: CandidateDetailsInput): CandidateDetails {
  return {
    headline: clean(input.headline),
    location: clean(input.location),
    linkedinUrl: clean(input.linkedinUrl),
    summary: clean(input.summary),
    skills: input.skills && input.skills.length ? input.skills : null,
    source: input.source ?? null,
  };
}

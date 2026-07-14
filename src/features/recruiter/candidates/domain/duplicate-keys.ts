/** Normalización compartida para detectar duplicados por email/LinkedIn (mismo criterio
 *  usado por la detección retroactiva de CandidatesList y el chequeo al cargar un candidato). */

export type DuplicateCandidateMatch = {
  id: string;
  fullName: string;
  matchedBy: "email" | "linkedin";
};

export function normalizeEmailKey(email?: string | null): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed || null;
}

export function normalizeLinkedinKey(url?: string | null): string | null {
  const trimmed = url?.trim().toLowerCase().replace(/\/+$/, "");
  return trimmed || null;
}

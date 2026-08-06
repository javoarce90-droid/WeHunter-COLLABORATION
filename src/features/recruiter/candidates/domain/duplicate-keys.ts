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

export type DuplicateKeyed = {
  id: string;
  email: string | null;
  linkedinUrl: string | null;
};

function dupKeysOf(c: DuplicateKeyed): string[] {
  const keys: string[] = [];
  const email = normalizeEmailKey(c.email);
  const linkedin = normalizeLinkedinKey(c.linkedinUrl);
  if (email) keys.push("e:" + email);
  if (linkedin) keys.push("l:" + linkedin);
  return keys;
}

/** Ids que comparten email o LinkedIn con al menos otro candidato del mismo conjunto —
 *  necesita ver TODO el conjunto a la vez (cross-row), nunca solo una página. `dupKeyOf`
 *  agrupa los pares adyacentes al ordenar la vista de "Duplicados". */
export function computeDuplicates(candidates: DuplicateKeyed[]): {
  duplicateIds: Set<string>;
  dupKeyOf: Map<string, string>;
} {
  const byKey = new Map<string, string[]>();
  const keyOf = new Map<string, string>();
  for (const c of candidates) {
    for (const k of dupKeysOf(c)) {
      const list = byKey.get(k) ?? [];
      list.push(c.id);
      byKey.set(k, list);
    }
  }
  const duplicateIds = new Set<string>();
  for (const [k, ids] of byKey) {
    if (ids.length > 1) {
      ids.forEach((id) => {
        duplicateIds.add(id);
        if (!keyOf.has(id)) keyOf.set(id, k);
      });
    }
  }
  return { duplicateIds, dupKeyOf: keyOf };
}

import type { CandidateSource } from "../../candidates/domain/candidate-details";

export const SOURCING_PLATFORMS = ["LinkedIn", "Computrabajo", "Bumeran", "GitHub"] as const;
export type SourcingPlatform = (typeof SOURCING_PLATFORMS)[number];

export type SourcingQuery = {
  keywords: string[]; // skills / términos
  location: string | null;
  seniority: string | null;
  platforms: SourcingPlatform[];
};

export type SourcingResult = {
  id: string; // sintético (determinístico), NO es un candidate id
  name: string;
  headline: string;
  location: string;
  skills: string[];
  platform: SourcingPlatform;
};

/** Hash estable (FNV-1a) para generación determinística. */
function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

/**
 * Construye una query booleana estilo LinkedIn a partir de los términos del builder.
 * Ej: ("React" OR "Node") AND "Buenos Aires" AND "senior"
 */
export function buildBooleanQuery(query: SourcingQuery): string {
  const parts: string[] = [];
  const kws = query.keywords.map((k) => k.trim()).filter(Boolean);
  if (kws.length === 1) parts.push(`"${kws[0]}"`);
  else if (kws.length > 1) parts.push(`(${kws.map((k) => `"${k}"`).join(" OR ")})`);
  if (query.location) parts.push(`"${query.location.trim()}"`);
  if (query.seniority) parts.push(`"${query.seniority.trim()}"`);
  return parts.join(" AND ");
}

const FIRST_NAMES = [
  "Lucía", "Mateo", "Sofía", "Benjamín", "Valentina", "Joaquín", "Martina", "Tomás",
  "Camila", "Lautaro", "Julieta", "Thiago", "Catalina", "Bautista", "Renata", "Felipe",
];
const LAST_NAMES = [
  "García", "Rodríguez", "Fernández", "López", "Martínez", "Pérez", "Gómez", "Díaz",
  "Romero", "Suárez", "Torres", "Ruiz", "Ramírez", "Flores", "Acosta", "Benítez",
];
const HEADLINES = [
  "{kw} en una scaleup",
  "{kw} · open to work",
  "Senior {kw}",
  "{kw} freelance",
  "{kw} en producto",
];
const FALLBACK_LOCATIONS = ["Buenos Aires", "Córdoba", "Rosario", "Remoto LATAM", "Montevideo"];

/**
 * Genera resultados MOCK de sourcing, determinísticos según la query (sin scraping real).
 * Cantidad acotada. Cada resultado trae plataforma, skills (derivadas de los keywords) y ubicación.
 */
export function generateSourcingResults(query: SourcingQuery, count = 8): SourcingResult[] {
  const platforms = query.platforms.length > 0 ? query.platforms : [...SOURCING_PLATFORMS];
  const kws = query.keywords.map((k) => k.trim()).filter(Boolean);
  const seed = stableHash(JSON.stringify({ kws, l: query.location, s: query.seniority }));

  const results: SourcingResult[] = [];
  for (let i = 0; i < count; i++) {
    const h = stableHash(`${seed}:${i}`);
    const name = `${FIRST_NAMES[h % FIRST_NAMES.length]} ${LAST_NAMES[(h >> 4) % LAST_NAMES.length]}`;
    const mainKw = kws.length > 0 ? kws[h % kws.length] : "Tech";
    const headline = HEADLINES[h % HEADLINES.length].replace("{kw}", mainKw);
    const location = query.location?.trim() || FALLBACK_LOCATIONS[h % FALLBACK_LOCATIONS.length];
    // Skills = los keywords de la query (o el principal) + variación determinística.
    const skills = kws.length > 0 ? kws.slice(0, 4) : [mainKw];
    results.push({
      id: `src-${seed}-${i}`,
      name,
      headline,
      location,
      skills,
      platform: platforms[i % platforms.length],
    });
  }
  return results;
}

/** Mapea la plataforma de origen a la fuente del candidato al importarlo al pool. */
export function platformToSource(platform: SourcingPlatform): CandidateSource {
  if (platform === "LinkedIn") return "linkedin";
  if (platform === "Computrabajo" || platform === "Bumeran") return "job_board";
  return "other";
}

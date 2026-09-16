import { normalizeLinkedinKey } from "../../candidates/domain/duplicate-keys";
import type {
  SourcingFilters,
  SourcingProvider,
  SourcingProviderCandidate,
  SourcingProviderResult,
} from "../domain/sourcing-provider";

/**
 * Proveedor de reversión sobre Serper (API de resultados de Google, X-Ray search). Implementa
 * `SourcingProvider` — mismo patrón que `GeminiAiProvider`/`MockAiProvider` para IA
 * (`src/lib/ai/`). Es el código que hasta acá vivía en `domain/linkedin-search.ts`, movido tal
 * cual (mismo comportamiento) — ver `openspec/changes/integrar-harvestapi-sourcing/design.md` §4.
 *
 * Sin datos de experiencia/educación/certificaciones/idiomas reales: Serper nunca los tuvo (solo
 * indexa snippets de Google, no el perfil completo) — quedan en `[]`/`null`. No es una
 * regresión respecto de hoy, es el techo ya conocido de este proveedor.
 */

export type LinkedInSearchQuery = {
  query: string;
};

/**
 * Hash estable FNV-1a para generación determinística de datos mock.
 */
function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

/**
 * Convierte un texto libre como "backend engineer supabase python"
 * en una query estilo X-Ray para Google Custom Search.
 * Ejemplo: site:linkedin.com/in/ "backend engineer" "supabase" "python"
 */
export function buildLinkedInXRayQuery(freeText: string): string {
  const clean = freeText.trim();
  if (!clean) return 'site:linkedin.com/in/';

  // Dividir por comas o espacios sin romper comillas
  const terms = clean
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const formattedTerms = terms.map((t) => (t.includes(' ') ? `"${t}"` : t)).join(' ');
  return `site:linkedin.com/in/ ${formattedTerms}`;
}

/** Arma el texto libre de búsqueda a partir de los filtros estructurados (puesto, hasta 3
 *  skills, seniority, ubicación) — Serper no tiene filtros server-side reales, todo termina
 *  como AND de texto en el X-Ray. Equivalente al intento 0 de `buildJobSourcingQuery` (hoy en
 *  `sourcear-para-busqueda.ts`), pero a partir de `SourcingFilters` en vez de `JobSourcingContext`. */
export function buildQueryFromFilters(filters: SourcingFilters): string {
  const terms = [
    filters.role,
    ...filters.skills.slice(0, 3),
    filters.seniority,
    filters.location,
  ].filter((t): t is string => Boolean(t && t.trim()));
  return terms.join(" ");
}

const DEMO_PROFILES = [
  {
    name: "Agustín Benítez",
    headline: "Senior Backend Engineer | Supabase · Python · Node.js",
    location: "Buenos Aires, Argentina",
    skills: ["Python", "Supabase", "PostgreSQL", "FastAPI"],
    linkedinUrl: "https://www.linkedin.com/in/agustin-benitez-backend",
    snippet: "Experiencia en arquitectura backend serverless, Supabase RLS y desarrollo con Python y FastAPI.",
  },
  {
    name: "Carolina Rossi",
    headline: "Full Stack Lead Developer @ FinTech",
    location: "Córdoba, Argentina",
    skills: ["Python", "Supabase", "React", "TypeScript"],
    linkedinUrl: "https://www.linkedin.com/in/carolina-rossi-dev",
    snippet: "Especialista en sistemas distribuidos, integraciones con Python y bases de datos relacionales en la nube.",
  },
  {
    name: "Matías Fernández",
    headline: "Python & Cloud Architect | Serverless & Postgres",
    location: "Montevideo, Uruguay",
    skills: ["Python", "Supabase", "AWS", "Docker"],
    linkedinUrl: "https://www.linkedin.com/in/matias-fernandez-cloud",
    snippet: "Liderando equipos de ingeniería backend. Apasionado por Python, Supabase y microservicios.",
  },
  {
    name: "Sofía Martínez",
    headline: "Software Engineer (Python / Django / Supabase)",
    location: "Rosario, Argentina",
    skills: ["Python", "Django", "Supabase", "REST API"],
    linkedinUrl: "https://www.linkedin.com/in/sofia-martinez-swe",
    snippet: "Desarrolladora Python con 5+ años creando APIs escalables e integrando Supabase y PostgreSQL.",
  },
  {
    name: "Ignacio Silva",
    headline: "Backend Specialist — Python, Go & Supabase",
    location: "Santiago, Chile",
    skills: ["Python", "Go", "Supabase", "GraphQL"],
    linkedinUrl: "https://www.linkedin.com/in/ignacio-silva-backend",
    snippet: "Ingeniero Backend orientado a alto rendimiento. Uso intensivo de Python y Supabase en producción.",
  },
];

/** País (nombre tal como puede aparecer en `location`) → código `gl` de Google/Serper. Cubre los
 *  mercados donde recluta WeHunter. Sin esto, la ubicación es solo una palabra suelta dentro del
 *  texto libre de búsqueda — Google puede ignorarla sin aviso cuando hay pocos resultados que la
 *  contengan literalmente, y devuelve perfiles de cualquier país (bug reportado: candidatos de
 *  Japón/Brasil con una búsqueda pensada para Argentina). `gl` sí es un filtro real a nivel API. */
const COUNTRY_TO_GL: Record<string, string> = {
  argentina: "ar",
  uruguay: "uy",
  chile: "cl",
  brasil: "br",
  brazil: "br",
  mexico: "mx",
  méxico: "mx",
  colombia: "co",
  peru: "pe",
  perú: "pe",
  paraguay: "py",
  bolivia: "bo",
  ecuador: "ec",
  españa: "es",
  spain: "es",
  "estados unidos": "us",
  usa: "us",
};

/** Busca en `text` (la query armada, ej. "...Buenos Aires Argentina") algún país conocido y
 *  devuelve su código `gl`. `undefined` si no reconoce ninguno — en ese caso no se manda `gl` y
 *  el comportamiento queda como antes (sin restricción geográfica a nivel API). */
const DIACRITICS = /[̀-ͯ]/g; // marcas combinantes que deja `normalize("NFD")`

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(DIACRITICS, "");
}

export function inferGoogleCountryCode(text: string): string | undefined {
  const normalized = stripAccents(text.toLowerCase());
  for (const [country, gl] of Object.entries(COUNTRY_TO_GL)) {
    const plain = stripAccents(country);
    if (new RegExp(`\\b${plain}\\b`).test(normalized)) return gl;
  }
  return undefined;
}

/**
 * Busca candidatos en LinkedIn a través de la API de Serper (Google X-Ray) si existe la llave
 * de entorno, o genera resultados dinámicos y realistas coincidiendo con la query. `page` (1+)
 * pagina resultados reales.
 *
 * Firma "legacy" (query/page) — uso interno de `SerperProvider.search()` (abajo), que la llama
 * en loop hasta juntar `maxResults`. El flujo de Sourcing con IA ya no la usa directamente:
 * `sourcear-para-busqueda.ts` llama al proveedor a través de la interface `SourcingProvider`
 * ("Buscar más candidatos" se eliminó, design.md §1.1).
 */
export async function searchLinkedInCandidates(
  input: LinkedInSearchQuery,
  page = 1,
): Promise<{ candidates: SourcingProviderCandidate[]; isLiveApi: boolean; error?: string }> {
  const rawQuery = input.query.trim();
  if (!rawQuery) return { candidates: [], isLiveApi: false };

  const serperKey = process.env.SERPER_API_KEY;
  const pageNum = Math.max(1, Math.floor(page));

  // 1. Consulta en tiempo real con Serper API
  if (serperKey) {
    try {
      const xray = buildLinkedInXRayQuery(rawQuery);
      const gl = inferGoogleCountryCode(rawQuery);
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: xray, num: 10, page: pageNum, ...(gl ? { gl } : {}) }),
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const organic = Array.isArray(data.organic) ? data.organic : [];
        const liveCandidates: SourcingProviderCandidate[] = organic
          .filter((item: { link?: string }) => item.link?.includes("linkedin.com/in/"))
          .map((item: { title?: string; snippet?: string; link?: string }, idx: number) => {
            const rawTitle = item.title ?? "Perfil de LinkedIn";
            const parts = rawTitle.replace(/\s*\|\s*LinkedIn$/i, "").split(/\s*-\s*/);
            const name = parts[0]?.trim() || "Candidato LinkedIn";
            const headline = parts.slice(1).join(" - ").trim() || "Perfil profesional en LinkedIn";
            const snippet = item.snippet || null;
            const link = item.link || `https://www.linkedin.com/in/search-${idx}`;

            const skills = rawQuery
              .split(/[\s,]+/)
              .map((s) => s.trim())
              .filter((s) => s.length > 2)
              .slice(0, 5);

            return {
              id: `linkedin-serper-p${pageNum}-${idx}-${stableHash(link)}`,
              name,
              headline,
              location: "Ubicación en LinkedIn",
              skills: skills.length > 0 ? skills : ["LinkedIn"],
              linkedinUrl: link,
              email: null,
              snippet,
              experience: [],
              education: [],
              certifications: [],
              languages: [],
            };
          });

        // La API respondió: el resultado es real aunque venga vacío. No sustituir por el
        // mock acá — mostrarle al recruiter "no encontramos candidatos" es mejor que
        // mostrarle perfiles inventados como si fueran reales y "ordenados por match".
        return { candidates: liveCandidates, isLiveApi: true };
      }
    } catch {
      // Acá sí falló la búsqueda en vivo de verdad (red, timeout, respuesta inválida) — cae
      // al fallback determinístico, no porque la búsqueda no haya encontrado nada.
    }
  }

  // Fallback / Entorno Mockup: sin API key, o la búsqueda en vivo falló de verdad (no llegó a
  // responder). Generación determinística contextualizada. `pageNum` desplaza los perfiles para
  // que "Buscar más candidatos" muestre movimiento también sin Serper (dev/demo).
  const queryTerms = rawQuery.toLowerCase().split(/[\s,]+/).filter(Boolean);
  const seed = stableHash(`${rawQuery}#${pageNum}`);

  const candidates: SourcingProviderCandidate[] = DEMO_PROFILES.map((p, idx) => {
    // Adapta dinámicamente las skills para reflejar la búsqueda ingresada por el usuario
    const dynamicSkills = Array.from(
      new Set([...queryTerms.map((t) => t.toUpperCase()), ...p.skills]),
    ).slice(0, 5);

    // Nombre + URL únicos por página, para que no colisionen con los de otras páginas.
    const name = pageNum > 1 ? `${p.name} (${pageNum})` : p.name;
    const realLinkedinSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
      `${name} ${rawQuery}`,
    )}`;

    return {
      id: `linkedin-mock-${seed}-${idx}`,
      name,
      headline: p.headline.includes("{kw}")
        ? p.headline.replace("{kw}", rawQuery)
        : p.headline,
      location: p.location,
      skills: dynamicSkills,
      linkedinUrl: realLinkedinSearchUrl,
      email: null,
      snippet: p.snippet,
      experience: [],
      education: [],
      certifications: [],
      languages: [],
    };
  });

  return { candidates, isLiveApi: false };
}

/** Tope de páginas que prueba `SerperProvider.search()` por llamada antes de darse por vencido
 *  — sin esto, un `maxResults` alto contra una búsqueda con pocos resultados reales pediría
 *  páginas indefinidamente. */
const SEARCH_METHOD_MAX_PAGES = 3;

export class SerperProvider implements SourcingProvider {
  async search(
    filters: SourcingFilters,
    maxResults: number,
    exclude: string[],
  ): Promise<SourcingProviderResult> {
    const query = buildQueryFromFilters(filters);
    const excluded = new Set(exclude);
    const collected: SourcingProviderCandidate[] = [];
    let isLiveApi = true;

    for (let page = 1; page <= SEARCH_METHOD_MAX_PAGES && collected.length < maxResults; page++) {
      const res = await searchLinkedInCandidates({ query }, page);
      if (res.error) {
        return { candidates: [], isLiveApi: false, costUsd: 0, provider: "serper", error: res.error };
      }
      isLiveApi = res.isLiveApi;
      if (res.candidates.length === 0) break; // página vacía: no hay más para pedir

      for (const c of res.candidates) {
        const key = normalizeLinkedinKey(c.linkedinUrl) ?? c.id;
        if (excluded.has(key)) continue;
        excluded.add(key);
        collected.push(c);
        if (collected.length >= maxResults) break;
      }
    }

    // Serper se paga por suscripción/plan, no encontramos un costo variable por perfil
    // documentado en este proyecto (a diferencia de HarvestAPI) — costUsd queda en 0. Si
    // aparece un costo real de Serper a futuro, ajustar acá.
    return { candidates: collected, isLiveApi, costUsd: 0, provider: "serper" };
  }
}

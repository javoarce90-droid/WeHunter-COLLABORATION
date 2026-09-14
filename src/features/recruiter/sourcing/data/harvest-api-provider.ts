import { normalizeEmailKey, normalizeLinkedinKey } from "../../candidates/domain/duplicate-keys";
import type {
  ProviderCertification,
  ProviderEducation,
  ProviderExperience,
  ProviderLanguage,
  SourcingFilters,
  SourcingProvider,
  SourcingProviderCandidate,
  SourcingProviderResult,
} from "../domain/sourcing-provider";

/**
 * Proveedor real sobre HarvestAPI, vía el actor de Apify `harvestapi/linkedin-profile-search`
 * (NO usar `-by-services`, `-by-name` ni `linkedin-profile-scraper` — son actores distintos).
 * Implementa `SourcingProvider` — ver `openspec/changes/integrar-harvestapi-sourcing/design.md`
 * §3. Siempre corre en `profileScraperMode: "Full"` (descubrimiento + enriquecimiento en una
 * sola llamada, exigido por el spec funcional) — el modo `Short` solo se usó para el
 * diagnóstico de facturación (proposal.md §3.2), nunca en producción.
 *
 * Nombres de campo de la respuesta de HarvestAPI confirmados contra una llamada real
 * (2026-09-14): `id`, `publicIdentifier`, `linkedinUrl`, `firstName`, `lastName`, `headline`,
 * `location`, `emails`. Los nombres exactos de los campos DENTRO de `experience`/`education`/
 * `certifications`/`languages` NO están 100% confirmados (design.md §11) — se asumen acá los
 * más comunes en scrapers de LinkedIn (`company`/`position`/`startDate`/`endDate`/
 * `description`, `institution`/`degree`/`fieldOfStudy`, `name`/`url`, `language`/`level`). El
 * mapeo es defensivo (leyendo alias razonables) para no romper si el nombre real difiere un
 * poco; validar contra una llamada real con token cuando exista (ver `.env.example`).
 */

const APIFY_ACTOR_URL =
  "https://api.apify.com/v2/acts/harvestapi~linkedin-profile-search/run-sync-get-dataset-items";

/** USD por página de búsqueda (hasta 25 perfiles), se cobra siempre, incluso con 0 resultados. */
const COST_PER_SEARCH_PAGE = 0.1;
/** USD por perfil completo (`profileScraperMode: "Full"`), sin búsqueda de email adicional. */
const COST_PER_FULL_PROFILE = 0.004;

/** Shape crudo esperado de un item del dataset de Apify — ver nota de cabecera sobre qué está
 *  confirmado y qué es una asunción razonable. Todo opcional: la respuesta real puede omitir
 *  campos, el mapeo no debe explotar si falta alguno. */
type RawHarvestItem = {
  id?: string;
  publicIdentifier?: string;
  linkedinUrl?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  headline?: string;
  location?: string;
  emails?: string[];
  skills?: string[];
  topSkills?: string[];
  experience?: Array<{
    company?: string;
    position?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education?: Array<{
    institution?: string;
    school?: string;
    degree?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
  }>;
  certifications?: Array<{ name?: string; title?: string; url?: string }>;
  languages?: Array<{ language?: string; name?: string; level?: string; proficiency?: string }>;
  // `endorsements` (y cualquier otro campo no listado acá) se ignora a propósito — fuera de
  // alcance del spec funcional. No se lee ni se mapea.
};

function mapExperience(raw: RawHarvestItem["experience"]): ProviderExperience[] {
  return (raw ?? []).map((e) => ({
    company: e.company ?? "",
    position: e.position ?? e.title ?? "",
    startDate: e.startDate ?? null,
    endDate: e.endDate ?? null,
    description: e.description ?? null,
  }));
}

function mapEducation(raw: RawHarvestItem["education"]): ProviderEducation[] {
  return (raw ?? []).map((e) => ({
    institution: e.institution ?? e.school ?? "",
    degree: e.degree ?? "",
    fieldOfStudy: e.fieldOfStudy ?? null,
    startDate: e.startDate ?? null,
    endDate: e.endDate ?? null,
  }));
}

function mapCertifications(raw: RawHarvestItem["certifications"]): ProviderCertification[] {
  return (raw ?? []).map((c) => ({ name: c.name ?? c.title ?? "", url: c.url ?? null }));
}

function mapLanguages(raw: RawHarvestItem["languages"]): ProviderLanguage[] {
  return (raw ?? []).map((l) => ({
    language: l.language ?? l.name ?? "",
    level: l.level ?? l.proficiency ?? null,
  }));
}

function mapCandidate(item: RawHarvestItem, idx: number): SourcingProviderCandidate {
  const name =
    [item.firstName, item.lastName].filter(Boolean).join(" ").trim() ||
    item.name ||
    "Candidato LinkedIn";
  const linkedinUrl =
    item.linkedinUrl ||
    (item.publicIdentifier ? `https://www.linkedin.com/in/${item.publicIdentifier}` : "");
  const email = (item.emails ?? []).find((e) => e && e.trim().length > 0) ?? null;

  return {
    id: item.id ?? `harvest-${idx}`,
    name,
    headline: item.headline ?? "",
    location: item.location ?? "",
    skills: item.skills ?? item.topSkills ?? [],
    linkedinUrl,
    email,
    snippet: null, // HarvestAPI no tiene "snippet" (eso era un concepto de Google/Serper).
    experience: mapExperience(item.experience),
    education: mapEducation(item.education),
    certifications: mapCertifications(item.certifications),
    languages: mapLanguages(item.languages),
  };
}

function excludeCandidates(
  candidates: SourcingProviderCandidate[],
  exclude: string[],
): SourcingProviderCandidate[] {
  if (exclude.length === 0) return candidates;
  const excluded = new Set(exclude);
  return candidates.filter((c) => {
    const emailKey = normalizeEmailKey(c.email);
    const linkedinKey = normalizeLinkedinKey(c.linkedinUrl);
    if (emailKey && excluded.has(emailKey)) return false;
    if (linkedinKey && excluded.has(linkedinKey)) return false;
    return !excluded.has(c.id);
  });
}

/** Perfiles ficticios para el fallback sin token/con falla de red — mismo criterio que
 *  `DEMO_PROFILES` de `serper-provider.ts`, pero con experiencia/educación/certificaciones/
 *  idiomas poblados (a diferencia de Serper, HarvestAPI sí tiene estos datos en producción, así
 *  que dev/demo debería poder mostrar la UI de detalle también sin token real). */
const DEMO_PROFILES: Omit<SourcingProviderCandidate, "id">[] = [
  {
    name: "Agustín Benítez",
    headline: "Senior Backend Engineer | Supabase · Python · Node.js",
    location: "Buenos Aires, Argentina",
    skills: ["Python", "Supabase", "PostgreSQL", "FastAPI"],
    linkedinUrl: "https://www.linkedin.com/in/agustin-benitez-backend",
    email: "agustin.benitez.demo@example.com",
    snippet: null,
    experience: [
      {
        company: "Fintech Demo SA",
        position: "Senior Backend Engineer",
        startDate: "2021-03",
        endDate: null,
        description: "Arquitectura backend serverless y RLS en Supabase.",
      },
    ],
    education: [
      {
        institution: "Universidad de Buenos Aires",
        degree: "Ingeniería en Informática",
        fieldOfStudy: "Sistemas",
        startDate: "2011",
        endDate: "2017",
      },
    ],
    certifications: [{ name: "AWS Certified Solutions Architect", url: null }],
    languages: [
      { language: "Español", level: "Native" },
      { language: "Inglés", level: "Professional" },
    ],
  },
  {
    name: "Carolina Rossi",
    headline: "Full Stack Lead Developer @ FinTech",
    location: "Córdoba, Argentina",
    skills: ["Python", "Supabase", "React", "TypeScript"],
    linkedinUrl: "https://www.linkedin.com/in/carolina-rossi-dev",
    email: "carolina.rossi.demo@example.com",
    snippet: null,
    experience: [
      {
        company: "Demo Labs",
        position: "Full Stack Lead",
        startDate: "2019-06",
        endDate: null,
        description: "Liderazgo de equipo full stack, sistemas distribuidos.",
      },
    ],
    education: [
      {
        institution: "Universidad Nacional de Córdoba",
        degree: "Licenciatura en Ciencias de la Computación",
        fieldOfStudy: null,
        startDate: "2010",
        endDate: "2016",
      },
    ],
    certifications: [],
    languages: [{ language: "Español", level: "Native" }],
  },
  {
    name: "Matías Fernández",
    headline: "Python & Cloud Architect | Serverless & Postgres",
    location: "Montevideo, Uruguay",
    skills: ["Python", "Supabase", "AWS", "Docker"],
    linkedinUrl: "https://www.linkedin.com/in/matias-fernandez-cloud",
    email: "matias.fernandez.demo@example.com",
    snippet: null,
    experience: [
      {
        company: "Cloud Demo Corp",
        position: "Cloud Architect",
        startDate: "2020-01",
        endDate: null,
        description: "Diseño de microservicios y arquitectura serverless.",
      },
    ],
    education: [
      {
        institution: "Universidad de la República",
        degree: "Ingeniería en Computación",
        fieldOfStudy: null,
        startDate: "2009",
        endDate: "2015",
      },
    ],
    certifications: [{ name: "Google Cloud Professional Architect", url: null }],
    languages: [
      { language: "Español", level: "Native" },
      { language: "Inglés", level: "Native" },
    ],
  },
  {
    name: "Sofía Martínez",
    headline: "Software Engineer (Python / Django / Supabase)",
    location: "Rosario, Argentina",
    skills: ["Python", "Django", "Supabase", "REST API"],
    linkedinUrl: "https://www.linkedin.com/in/sofia-martinez-swe",
    email: "sofia.martinez.demo@example.com",
    snippet: null,
    experience: [
      {
        company: "Demo APIs SRL",
        position: "Software Engineer",
        startDate: "2018-08",
        endDate: null,
        description: "Desarrollo de APIs escalables con Django y Supabase.",
      },
    ],
    education: [
      {
        institution: "Universidad Nacional de Rosario",
        degree: "Analista de Sistemas",
        fieldOfStudy: null,
        startDate: "2013",
        endDate: "2017",
      },
    ],
    certifications: [],
    languages: [{ language: "Español", level: "Native" }],
  },
];

function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

function fallbackCandidates(filters: SourcingFilters, maxResults: number): SourcingProviderCandidate[] {
  const seed = stableHash(`${filters.role}#${filters.location}#${filters.skills.join(",")}`);
  return DEMO_PROFILES.slice(0, Math.max(1, maxResults)).map((p, idx) => ({
    ...p,
    id: `harvest-mock-${seed}-${idx}`,
  }));
}

export class HarvestApiProvider implements SourcingProvider {
  constructor(private readonly apiToken: string | undefined) {}

  async search(
    filters: SourcingFilters,
    maxResults: number,
    exclude: string[],
  ): Promise<SourcingProviderResult> {
    if (this.apiToken) {
      try {
        const searchQuery = [...filters.skills, filters.seniority]
          .filter((t): t is string => Boolean(t && t.trim()))
          .join(" ");
        const body = {
          profileScraperMode: "Full" as const,
          takePages: 1,
          maxItems: maxResults,
          currentJobTitles: [filters.role],
          locations: [filters.location],
          ...(searchQuery ? { searchQuery } : {}),
        };

        const res = await fetch(`${APIFY_ACTOR_URL}?token=${this.apiToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          cache: "no-store",
        });

        if (res.ok) {
          const data = (await res.json()) as RawHarvestItem[];
          const items = Array.isArray(data) ? data : [];
          const candidates = excludeCandidates(
            items.map((item, idx) => mapCandidate(item, idx)),
            exclude,
          );
          // Estimado — fee de página fijo + perfiles completos pedidos. Si Apify llegara a
          // devolver el costo real (header o campo de la respuesta), preferirlo acá; no se
          // encontró ese dato en la respuesta de la prueba real (2026-09-14).
          const costUsd = COST_PER_SEARCH_PAGE + maxResults * COST_PER_FULL_PROFILE;
          return { candidates, isLiveApi: true, costUsd };
        }
      } catch {
        // Falla de red/timeout real — cae al fallback determinístico, igual que SerperProvider.
      }
    }

    // Sin token, o la llamada en vivo no llegó a responder bien: fallback determinístico para
    // que dev/demo sigan funcionando sin cuenta real de Apify/HarvestAPI.
    const candidates = excludeCandidates(fallbackCandidates(filters, maxResults), exclude);
    return { candidates, isLiveApi: false, costUsd: 0 };
  }
}

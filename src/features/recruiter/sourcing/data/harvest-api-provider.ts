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
 * (2026-09-14, re-confirmado 2026-09-15 con un token real — perfil completo, incluidas
 * `experience`/`education`): `id`, `publicIdentifier`, `linkedinUrl`, `firstName`, `lastName`,
 * `headline`, `emails`, `about` (el "Acerca de" real del perfil). `location` NO es un string
 * plano — es un objeto (`linkedinText`/`countryCode`/`parsed.{text,city,state,country}`), ver
 * `extractLocationText`. `skills`/`topSkills` NO son `string[]` — son
 * `{name, positions}[]` (`positions` = en qué experiencias se usó esa skill), ver
 * `extractSkillNames`. `experience[]` usa `companyName` (no `company`), `duration` (texto tipo
 * "1 yr", fallback cuando falta fecha) y `startDate`/`endDate` como objeto `{year, text}` igual
 * que `education[]` (re-confirmado 2026-09-15 con un segundo candidato real que sí tenía fechas
 * — el primer candidato de prueba no las tenía cargadas en LinkedIn, lo que hizo pensar que no
 * existían). `education[]` usa `schoolName` (no `institution`), `period` (texto combinado) y
 * `startDate`/`endDate` como el mismo objeto `{year, text}`, ver `extractYearText`.
 * `certifications`/`languages` siguen sin confirmar con datos reales — su mapeo sigue siendo
 * defensivo (alias razonables: `name`/`url`, `language`/`level`).
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
  // Confirmado contra una llamada real (2026-09-15): NO es un string plano — viene como objeto
  // estructurado. `linkedinText` es el texto tal cual lo muestra LinkedIn, `parsed` lo
  // descompone. Se deja `string` como alternativa defensiva por si el actor cambia el shape.
  location?:
    | string
    | {
        linkedinText?: string;
        countryCode?: string;
        parsed?: { text?: string; city?: string; state?: string; country?: string };
      };
  // Confirmado contra una llamada real (2026-09-15): SÍ existe — es el "Acerca de" real del
  // perfil de LinkedIn. La cabecera del archivo decía que HarvestAPI "no tiene snippet"; eso
  // era una asunción sin validar, corregida acá.
  about?: string;
  emails?: string[];
  // Cada skill trae de qué experiencias sale (`positions`, texto libre tipo "8 experiences
  // across X and 7 other companies") — no lo usamos, solo el nombre.
  skills?: Array<string | { name?: string; positions?: string[] }>;
  topSkills?: Array<string | { name?: string; positions?: string[] }>;
  experience?: Array<{
    companyName?: string;
    company?: string; // alias defensivo, no confirmado en la respuesta real
    position?: string;
    title?: string;
    duration?: string; // texto tipo "1 yr" — fallback cuando no hay startDate/endDate
    // Confirmado contra una llamada real (2026-09-15): igual que en `education`, viene como
    // objeto `{year, text}`, no como string — ver `extractYearText`.
    startDate?: string | { year?: number; text?: string };
    endDate?: string | { year?: number; text?: string };
    description?: string;
  }>;
  education?: Array<{
    schoolName?: string;
    institution?: string; // alias defensivo, no confirmado en la respuesta real
    school?: string; // alias defensivo, no confirmado en la respuesta real
    degree?: string;
    fieldOfStudy?: string;
    period?: string; // texto combinado tipo "2004 - 2006"
    startDate?: string | { year?: number; text?: string };
    endDate?: string | { year?: number; text?: string };
  }>;
  certifications?: Array<{ name?: string; title?: string; url?: string }>;
  languages?: Array<{ language?: string; name?: string; level?: string; proficiency?: string }>;
  // `endorsements` (y cualquier otro campo no listado acá) se ignora a propósito — fuera de
  // alcance del spec funcional. No se lee ni se mapea.
};

/** `skills`/`topSkills` de HarvestAPI vienen como `{name, positions}[]`, no `string[]` — ver
 *  nota de cabecera. Defensivo ante el caso de que alguna vez llegue un string plano. */
function extractSkillNames(raw: RawHarvestItem["skills"]): string[] {
  return (raw ?? [])
    .map((s) => (typeof s === "string" ? s : s.name))
    .filter((s): s is string => Boolean(s && s.trim()));
}

/** `education[].startDate`/`endDate` vienen como `{year, text}`, no strings — ver nota de
 *  cabecera. Defensivo ante un string plano. */
function extractYearText(value: string | { year?: number; text?: string } | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.text ?? (value.year ? String(value.year) : null);
}

function mapExperience(raw: RawHarvestItem["experience"]): ProviderExperience[] {
  return (raw ?? []).map((e) => {
    const startDate = extractYearText(e.startDate);
    const endDate = extractYearText(e.endDate);
    return {
      company: e.companyName ?? e.company ?? "",
      position: e.position ?? e.title ?? "",
      startDate,
      endDate,
      // `duration` ("1 yr") solo se agrega a la descripción cuando no hay startDate/endDate
      // reales que extraer — evita repetir la misma info dos veces cuando sí los hay.
      description:
        [e.description, !startDate && !endDate && e.duration ? `Duración: ${e.duration}` : null]
          .filter((v): v is string => Boolean(v))
          .join("\n\n") || null,
    };
  });
}

function mapEducation(raw: RawHarvestItem["education"]): ProviderEducation[] {
  return (raw ?? []).map((e) => ({
    institution: e.schoolName ?? e.institution ?? e.school ?? "",
    degree: e.degree ?? "",
    fieldOfStudy: e.fieldOfStudy ?? null,
    startDate: extractYearText(e.startDate),
    endDate: extractYearText(e.endDate),
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

/** `location` puede llegar como string plano o como el objeto estructurado confirmado en una
 *  llamada real (`linkedinText`/`parsed.text`) — ver `RawHarvestItem.location`. */
function extractLocationText(location: RawHarvestItem["location"]): string {
  if (!location) return "";
  if (typeof location === "string") return location;
  return location.linkedinText ?? location.parsed?.text ?? "";
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
    location: extractLocationText(item.location),
    skills: extractSkillNames(item.skills).length > 0
      ? extractSkillNames(item.skills)
      : extractSkillNames(item.topSkills),
    linkedinUrl,
    email,
    snippet: item.about ?? null, // "Acerca de" real del perfil — ver nota en RawHarvestItem.
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
        // `currentJobTitles` es un filtro estricto de "puesto actual" — probado contra una
        // llamada real (2026-09-15): combinado con un `searchQuery` largo (todas las skills)
        // devolvió 0 resultados para un puesto con oferta real confirmada en LinkedIn (el
        // usuario lo verificó a mano). Se lo reemplaza por keywords amplias en `searchQuery`.
        // Primera vuelta con 3 skills (`filters.skills.slice(0, 3)`, mismo criterio que
        // `SerperProvider`) siguió siendo más angosto que una búsqueda manual real de LinkedIn
        // (`keywords=Product Designer`, 2 palabras) — el usuario confirmó con evidencia (una
        // búsqueda manual con decenas de resultados vs. 2 acá) que 1 sola skill alcanza; más
        // términos combinados reduce demasiado el pool.
        const searchQuery = [filters.role, ...filters.skills.slice(0, 1), filters.seniority]
          .filter((t): t is string => Boolean(t && t.trim()))
          .join(" ");
        const body = {
          profileScraperMode: "Full" as const,
          takePages: 1,
          maxItems: maxResults,
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
          return { candidates, isLiveApi: true, costUsd, provider: "harvestapi" };
        }
      } catch {
        // Falla de red/timeout real — cae al fallback determinístico, igual que SerperProvider.
      }
    }

    // Sin token, o la llamada en vivo no llegó a responder bien: fallback determinístico para
    // que dev/demo sigan funcionando sin cuenta real de Apify/HarvestAPI.
    const candidates = excludeCandidates(fallbackCandidates(filters, maxResults), exclude);
    return { candidates, isLiveApi: false, costUsd: 0, provider: "harvestapi" };
  }
}

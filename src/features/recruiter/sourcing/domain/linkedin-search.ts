export type LinkedInCandidateResult = {
  id: string; // sintético (determinístico), NO es un candidate id
  name: string;
  headline: string;
  location: string;
  skills: string[];
  linkedinUrl: string;
  snippet?: string | null;
};

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

/**
 * Busca candidatos en LinkedIn a través de la API de Serper (Google X-Ray) si existe la llave
 * de entorno, o genera resultados dinámicos y realistas coincidiendo con la query. `page` (1+)
 * pagina resultados reales — es lo que hace que "Buscar más candidatos" avance sobre perfiles
 * distintos en vez de repetir el mismo top-10.
 */
export async function searchLinkedInCandidates(
  input: LinkedInSearchQuery,
  page = 1,
): Promise<{ candidates: LinkedInCandidateResult[]; isLiveApi: boolean; error?: string }> {
  const rawQuery = input.query.trim();
  if (!rawQuery) return { candidates: [], isLiveApi: false };

  const serperKey = process.env.SERPER_API_KEY;
  const pageNum = Math.max(1, Math.floor(page));

  // 1. Consulta en tiempo real con Serper API
  if (serperKey) {
    try {
      const xray = buildLinkedInXRayQuery(rawQuery);
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: xray, num: 10, page: pageNum }),
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const organic = Array.isArray(data.organic) ? data.organic : [];
        const liveCandidates: LinkedInCandidateResult[] = organic
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
              snippet,
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

  const candidates: LinkedInCandidateResult[] = DEMO_PROFILES.map((p, idx) => {
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
      snippet: p.snippet,
    };
  });

  return { candidates, isLiveApi: false };
}

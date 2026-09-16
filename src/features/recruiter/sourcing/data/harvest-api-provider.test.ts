import { describe, it, expect, afterEach } from "vitest";
import { HarvestApiProvider } from "./harvest-api-provider";
import type { SourcingFilters } from "../domain/sourcing-provider";

const filters: SourcingFilters = {
  role: "Backend Engineer",
  skills: ["Python", "Supabase"],
  seniority: "senior",
  location: "Argentina",
};

/** Fixture ficticio del shape confirmado en la prueba real contra HarvestAPI (2026-09-14,
 *  `profileScraperMode: "Full"`) — nombres y datos inventados, no son de una persona real.
 *  Incluye un campo de endorsements a propósito, para probar que se ignora al mapear. */
function fixtureItem(over: Record<string, unknown> = {}) {
  return {
    id: "harvest-id-abc123",
    publicIdentifier: "juana-perez-dev",
    linkedinUrl: "https://www.linkedin.com/in/juana-perez-dev",
    firstName: "Juana",
    lastName: "Pérez",
    headline: "Senior Backend Engineer @ Acme",
    location: "Córdoba, Argentina",
    emails: ["juana.perez@example.com"],
    skills: ["Python", "Django", "PostgreSQL"],
    experience: [
      {
        company: "Acme Corp",
        position: "Senior Backend Engineer",
        startDate: "2022-01",
        endDate: null,
        description: "Liderazgo técnico de la API principal.",
      },
    ],
    education: [
      {
        institution: "Universidad Nacional de Córdoba",
        degree: "Ingeniería en Sistemas",
        fieldOfStudy: "Sistemas de Información",
        startDate: "2012",
        endDate: "2018",
      },
    ],
    certifications: [{ name: "AWS Certified Developer", url: "https://aws.example/cert" }],
    languages: [
      { language: "Español", level: "Native" },
      { language: "Inglés", level: "Professional" },
    ],
    endorsements: [{ skill: "Python", count: 12 }],
    ...over,
  };
}

describe("HarvestApiProvider.search — mapeo de respuesta real", () => {
  const originalFetch = global.fetch;
  let capturedInit: RequestInit | undefined;
  let capturedUrl: string | undefined;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetchOk(items: unknown[]) {
    global.fetch = (async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return { ok: true, json: async () => items };
    }) as typeof fetch;
  }

  it("mapea todos los campos del perfil completo, ignorando endorsements", async () => {
    mockFetchOk([fixtureItem()]);
    const provider = new HarvestApiProvider("test-token");
    const res = await provider.search(filters, 5, []);

    expect(res.isLiveApi).toBe(true);
    expect(res.candidates).toHaveLength(1);
    const c = res.candidates[0]!;
    expect(c.name).toBe("Juana Pérez");
    expect(c.headline).toBe("Senior Backend Engineer @ Acme");
    expect(c.location).toBe("Córdoba, Argentina");
    expect(c.linkedinUrl).toBe("https://www.linkedin.com/in/juana-perez-dev");
    expect(c.email).toBe("juana.perez@example.com");
    expect(c.skills).toEqual(["Python", "Django", "PostgreSQL"]);
    expect(c.experience).toEqual([
      {
        company: "Acme Corp",
        position: "Senior Backend Engineer",
        startDate: "2022-01",
        endDate: null,
        description: "Liderazgo técnico de la API principal.",
      },
    ]);
    expect(c.education).toEqual([
      {
        institution: "Universidad Nacional de Córdoba",
        degree: "Ingeniería en Sistemas",
        fieldOfStudy: "Sistemas de Información",
        startDate: "2012",
        endDate: "2018",
      },
    ]);
    expect(c.certifications).toEqual([
      { name: "AWS Certified Developer", url: "https://aws.example/cert" },
    ]);
    expect(c.languages).toEqual([
      { language: "Español", level: "Native" },
      { language: "Inglés", level: "Professional" },
    ]);
    // endorsements no debe aparecer en ningún campo del candidato mapeado.
    expect(JSON.stringify(c)).not.toContain("endorsements");
  });

  it("email es null si `emails` viene vacío", async () => {
    mockFetchOk([fixtureItem({ emails: [] })]);
    const provider = new HarvestApiProvider("test-token");
    const res = await provider.search(filters, 5, []);
    expect(res.candidates[0]!.email).toBeNull();
  });

  // Shape real confirmado contra una llamada real a HarvestAPI (2026-09-15) — distinto del
  // fixture "ficticio" de arriba en varios campos clave: `skills` como objetos, `location` como
  // objeto estructurado, `experience`/`education` con otros nombres de campo.
  it("mapea `skills` real: objetos {name, positions}, no strings", async () => {
    mockFetchOk([
      fixtureItem({
        skills: [
          { name: "Gestión de backlog", positions: ["8 experiences across X"] },
          { name: "Scrum", positions: [] },
        ],
      }),
    ]);
    const provider = new HarvestApiProvider("test-token");
    const res = await provider.search(filters, 5, []);
    expect(res.candidates[0]!.skills).toEqual(["Gestión de backlog", "Scrum"]);
  });

  it("cae a `topSkills` (mismo shape de objetos) cuando `skills` viene vacío", async () => {
    mockFetchOk([
      fixtureItem({
        skills: [],
        topSkills: [{ name: "Figma", positions: [] }],
      }),
    ]);
    const provider = new HarvestApiProvider("test-token");
    const res = await provider.search(filters, 5, []);
    expect(res.candidates[0]!.skills).toEqual(["Figma"]);
  });

  it("mapea `location` real: objeto estructurado con `linkedinText`/`parsed.text`", async () => {
    mockFetchOk([
      fixtureItem({
        location: {
          linkedinText: "Buenos Aires, Buenos Aires Province, Argentina",
          countryCode: "AR",
          parsed: { text: "Buenos Aires, Argentina", city: "Buenos Aires", country: "Argentina" },
        },
      }),
    ]);
    const provider = new HarvestApiProvider("test-token");
    const res = await provider.search(filters, 5, []);
    expect(res.candidates[0]!.location).toBe("Buenos Aires, Buenos Aires Province, Argentina");
  });

  it("mapea `about` real al `snippet` del candidato (no un texto de match de IA)", async () => {
    mockFetchOk([fixtureItem({ about: "Soy Analista Funcional Senior con experiencia en..." })]);
    const provider = new HarvestApiProvider("test-token");
    const res = await provider.search(filters, 5, []);
    expect(res.candidates[0]!.snippet).toBe("Soy Analista Funcional Senior con experiencia en...");
  });

  it("mapea `experience` real: `companyName` (no `company`) y `duration` agregada a la descripción", async () => {
    mockFetchOk([
      fixtureItem({
        experience: [
          {
            companyName: "Profesional Independiente",
            position: "Analista Técnico Funcional Sr.",
            duration: "1 yr",
            description: "Relevamiento de requerimientos.",
          },
        ],
      }),
    ]);
    const provider = new HarvestApiProvider("test-token");
    const res = await provider.search(filters, 5, []);
    expect(res.candidates[0]!.experience).toEqual([
      {
        company: "Profesional Independiente",
        position: "Analista Técnico Funcional Sr.",
        startDate: null,
        endDate: null,
        description: "Relevamiento de requerimientos.\n\nDuración: 1 yr",
      },
    ]);
  });

  it("mapea `experience[].startDate`/`endDate` reales como objeto {year, text} — sin repetir `duration` cuando ya hay fechas", async () => {
    mockFetchOk([
      fixtureItem({
        experience: [
          {
            companyName: "Limelight",
            position: "Senior Product Designer",
            duration: "7 mos",
            startDate: { year: 2025, text: "Mar 2025" },
            endDate: { year: 2025, text: "Sep 2025" },
          },
        ],
      }),
    ]);
    const provider = new HarvestApiProvider("test-token");
    const res = await provider.search(filters, 5, []);
    expect(res.candidates[0]!.experience).toEqual([
      {
        company: "Limelight",
        position: "Senior Product Designer",
        startDate: "Mar 2025",
        endDate: "Sep 2025",
        description: null,
      },
    ]);
  });

  it("mapea `education` real: `schoolName` y `startDate`/`endDate` como objeto {year, text}", async () => {
    mockFetchOk([
      fixtureItem({
        education: [
          {
            schoolName: "UADE",
            degree: "Ingeniero en Informática",
            fieldOfStudy: "Ingeniería informática",
            period: "2004 - 2006",
            startDate: { year: 2004, text: "2004" },
            endDate: { year: 2006, text: "2006" },
          },
        ],
      }),
    ]);
    const provider = new HarvestApiProvider("test-token");
    const res = await provider.search(filters, 5, []);
    expect(res.candidates[0]!.education).toEqual([
      {
        institution: "UADE",
        degree: "Ingeniero en Informática",
        fieldOfStudy: "Ingeniería informática",
        startDate: "2004",
        endDate: "2006",
      },
    ]);
  });

  it("arma el input del actor con profileScraperMode Full, maxItems, ubicación estructurada y el resto como keywords", async () => {
    mockFetchOk([]);
    const provider = new HarvestApiProvider("test-token");
    await provider.search(filters, 7, []);

    expect(capturedUrl).toContain(
      "https://api.apify.com/v2/acts/harvestapi~linkedin-profile-search/run-sync-get-dataset-items",
    );
    expect(capturedUrl).toContain("token=test-token");
    const body = JSON.parse(capturedInit!.body as string);
    expect(body.profileScraperMode).toBe("Full");
    expect(body.maxItems).toBe(7);
    expect(body.takePages).toBe(1);
    expect(body.locations).toEqual(["Argentina"]);
    // `currentJobTitles` (filtro estricto de "puesto actual") se reemplazó por keywords en
    // `searchQuery` — probado contra una llamada real (2026-09-15) que devolvió 0 resultados
    // para un puesto con oferta real confirmada en LinkedIn, ver nota en harvest-api-provider.ts.
    expect(body.currentJobTitles).toBeUndefined();
    expect(body.searchQuery).toBe("Backend Engineer Python senior");
  });

  it("searchQuery usa 1 sola skill top, no todas — más angosto no da mejores resultados (confirmado con una búsqueda real, 2026-09-15)", async () => {
    mockFetchOk([]);
    const provider = new HarvestApiProvider("test-token");
    await provider.search(
      { ...filters, skills: ["Python", "Supabase", "AWS", "Docker", "Kubernetes"] },
      3,
      [],
    );
    const body = JSON.parse(capturedInit!.body as string);
    expect(body.searchQuery).toBe("Backend Engineer Python senior");
  });

  it("costUsd = 0.10 + maxItems * 0.004 en una llamada real", async () => {
    mockFetchOk([]);
    const provider = new HarvestApiProvider("test-token");
    const res = await provider.search(filters, 10, []);
    expect(res.costUsd).toBeCloseTo(0.1 + 10 * 0.004, 5);
  });

  it("excluye candidatos cuya clave (linkedinUrl o email) está en `exclude`", async () => {
    mockFetchOk([fixtureItem(), fixtureItem({ id: "other", publicIdentifier: "otro-candidato", linkedinUrl: "https://www.linkedin.com/in/otro-candidato", emails: ["otro@example.com"] })]);
    const provider = new HarvestApiProvider("test-token");
    const res = await provider.search(filters, 5, ["juana.perez@example.com"]);
    expect(res.candidates).toHaveLength(1);
    expect(res.candidates[0]!.email).toBe("otro@example.com");
  });
});

describe("HarvestApiProvider.search — sin token o con falla de red", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("sin APIFY_API_TOKEN → fallback determinístico, isLiveApi false, costUsd 0", async () => {
    const provider = new HarvestApiProvider(undefined);
    const res = await provider.search(filters, 4, []);
    expect(res.isLiveApi).toBe(false);
    expect(res.costUsd).toBe(0);
    expect(res.candidates.length).toBeGreaterThan(0);
    expect(res.candidates.length).toBeLessThanOrEqual(4);
    for (const c of res.candidates) {
      expect(c.experience.length).toBeGreaterThan(0);
      expect(c.education.length).toBeGreaterThan(0);
    }
  });

  it("si la llamada HTTP falla (red), cae al fallback determinístico en vez de tirar", async () => {
    global.fetch = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    const provider = new HarvestApiProvider("test-token");
    const res = await provider.search(filters, 3, []);
    expect(res.isLiveApi).toBe(false);
    expect(res.costUsd).toBe(0);
    expect(res.candidates.length).toBeGreaterThan(0);
  });

  it("si Apify responde no-ok, cae al fallback determinístico", async () => {
    global.fetch = (async () => ({
      ok: false,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    const provider = new HarvestApiProvider("test-token");
    const res = await provider.search(filters, 3, []);
    expect(res.isLiveApi).toBe(false);
  });

  it("el fallback determinístico es determinístico (misma búsqueda → mismos ids)", async () => {
    const provider = new HarvestApiProvider(undefined);
    const a = await provider.search(filters, 4, []);
    const b = await provider.search(filters, 4, []);
    expect(a.candidates.map((c) => c.id)).toEqual(b.candidates.map((c) => c.id));
  });
});

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

  it("arma el input del actor con profileScraperMode Full, maxItems y filtros estructurados", async () => {
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
    expect(body.currentJobTitles).toEqual(["Backend Engineer"]);
    expect(body.locations).toEqual(["Argentina"]);
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

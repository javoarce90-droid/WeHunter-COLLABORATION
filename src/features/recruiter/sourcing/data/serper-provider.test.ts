import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  inferGoogleCountryCode,
  searchLinkedInCandidates,
  buildQueryFromFilters,
  SerperProvider,
} from "./serper-provider";
import { normalizeLinkedinKey } from "../../candidates/domain/duplicate-keys";
import type { SourcingFilters } from "../domain/sourcing-provider";

describe("inferGoogleCountryCode", () => {
  it("reconoce el país al final del query de sourcing", () => {
    expect(inferGoogleCountryCode("Senior Backend Engineer Python Buenos Aires Argentina")).toBe(
      "ar",
    );
  });

  it("ignora mayúsculas/tildes", () => {
    expect(inferGoogleCountryCode("Analista de datos Ciudad de MÉXICO")).toBe("mx");
  });

  it("no confunde una palabra que contiene el nombre del país como substring", () => {
    expect(inferGoogleCountryCode("Fan de Argentinos Juniors")).toBeUndefined();
  });

  it("devuelve undefined si no reconoce ningún país", () => {
    expect(inferGoogleCountryCode("Senior Backend Engineer Python Tokio")).toBeUndefined();
  });
});

describe("searchLinkedInCandidates — restricción geográfica real (gl) contra Serper", () => {
  const originalKey = process.env.SERPER_API_KEY;
  const originalFetch = global.fetch;
  let capturedInit: RequestInit | undefined;

  beforeEach(() => {
    process.env.SERPER_API_KEY = "test-key";
    capturedInit = undefined;
    global.fetch = (async (_url, init) => {
      capturedInit = init;
      return { ok: true, json: async () => ({ organic: [] }) };
    }) as typeof fetch;
  });

  afterEach(() => {
    process.env.SERPER_API_KEY = originalKey;
    global.fetch = originalFetch;
  });

  function sentBody(): { gl?: string } {
    return JSON.parse(capturedInit!.body as string);
  }

  it("manda gl:'ar' cuando el query menciona Argentina (ej. el default de sourcing)", async () => {
    await searchLinkedInCandidates({ query: "Backend Engineer Python Argentina" });
    expect(sentBody().gl).toBe("ar");
  });

  it("no manda gl si no reconoce ningún país en el query", async () => {
    await searchLinkedInCandidates({ query: "Backend Engineer Python" });
    expect(sentBody().gl).toBeUndefined();
  });
});

describe("searchLinkedInCandidates — shape SourcingProviderCandidate", () => {
  it("el fallback sin key devuelve candidatos con los campos nuevos vacíos, no undefined", async () => {
    const originalKey = process.env.SERPER_API_KEY;
    delete process.env.SERPER_API_KEY;
    try {
      const res = await searchLinkedInCandidates({ query: "Backend Engineer" });
      expect(res.candidates.length).toBeGreaterThan(0);
      for (const c of res.candidates) {
        expect(c.email).toBeNull();
        expect(c.experience).toEqual([]);
        expect(c.education).toEqual([]);
        expect(c.certifications).toEqual([]);
        expect(c.languages).toEqual([]);
      }
    } finally {
      process.env.SERPER_API_KEY = originalKey;
    }
  });
});

describe("buildQueryFromFilters", () => {
  const filters = (over: Partial<SourcingFilters> = {}): SourcingFilters => ({
    role: "Senior Backend Engineer",
    skills: ["Python", "Supabase", "AWS", "Docker"],
    seniority: "senior",
    location: "Buenos Aires",
    ...over,
  });

  it("junta role + hasta 3 skills + seniority + location", () => {
    expect(buildQueryFromFilters(filters())).toBe(
      "Senior Backend Engineer Python Supabase AWS senior Buenos Aires",
    );
  });

  it("ignora campos vacíos/null", () => {
    expect(buildQueryFromFilters(filters({ skills: [], seniority: null }))).toBe(
      "Senior Backend Engineer Buenos Aires",
    );
  });
});

describe("SerperProvider.search", () => {
  const originalKey = process.env.SERPER_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.SERPER_API_KEY; // fuerza el fallback determinístico, sin red
  });

  afterEach(() => {
    process.env.SERPER_API_KEY = originalKey;
    global.fetch = originalFetch;
  });

  const filters: SourcingFilters = {
    role: "Backend Engineer",
    skills: ["Python"],
    seniority: null,
    location: "Argentina",
  };

  it("devuelve hasta maxResults candidatos, con costUsd 0", async () => {
    const provider = new SerperProvider();
    const res = await provider.search(filters, 3, []);
    expect(res.candidates.length).toBeLessThanOrEqual(3);
    expect(res.candidates.length).toBeGreaterThan(0);
    expect(res.costUsd).toBe(0);
  });

  it("no devuelve candidatos cuya clave ya está en exclude", async () => {
    // Contrato de la interface: `exclude` son claves ya normalizadas (mismo criterio que
    // `findExistingLinkedinUrls` en el resto del dominio) — el caller normaliza, no el proveedor.
    const provider = new SerperProvider();
    const first = await provider.search(filters, 5, []);
    const firstKeys = first.candidates.map(
      (c) => normalizeLinkedinKey(c.linkedinUrl) ?? c.id,
    );
    const second = await provider.search(filters, 5, firstKeys);
    const overlap = second.candidates.filter((c) =>
      firstKeys.includes(normalizeLinkedinKey(c.linkedinUrl) ?? c.id),
    );
    expect(overlap).toHaveLength(0);
  });
});

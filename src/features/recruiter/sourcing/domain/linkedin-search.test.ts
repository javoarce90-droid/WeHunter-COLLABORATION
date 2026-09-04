import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { inferGoogleCountryCode, searchLinkedInCandidates } from "./linkedin-search";

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
    // "Argentinos Juniors" no debería matchear "argentina" por substring — bordes de palabra.
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

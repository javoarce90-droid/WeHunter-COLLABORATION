import { describe, it, expect, afterEach, vi } from "vitest";
import { resolveSourcingProviderKind, getSourcingProvider } from "./get-sourcing-provider";
import { SerperProvider } from "../data/serper-provider";

describe("resolveSourcingProviderKind", () => {
  it("sin APIFY_API_TOKEN → serper", () => {
    expect(resolveSourcingProviderKind({})).toBe("serper");
  });

  it("con APIFY_API_TOKEN y sin SOURCING_PROVIDER=serper → harvest", () => {
    expect(resolveSourcingProviderKind({ APIFY_API_TOKEN: "token" })).toBe("harvest");
  });

  it("con SOURCING_PROVIDER=serper, aunque haya token → serper (el flag de reversión gana siempre)", () => {
    expect(
      resolveSourcingProviderKind({ APIFY_API_TOKEN: "token", SOURCING_PROVIDER: "serper" }),
    ).toBe("serper");
  });

  it("con SOURCING_PROVIDER=serper y sin token → serper", () => {
    expect(resolveSourcingProviderKind({ SOURCING_PROVIDER: "serper" })).toBe("serper");
  });
});

describe("getSourcingProvider", () => {
  const originalToken = process.env.APIFY_API_TOKEN;
  const originalFlag = process.env.SOURCING_PROVIDER;

  afterEach(() => {
    process.env.APIFY_API_TOKEN = originalToken;
    process.env.SOURCING_PROVIDER = originalFlag;
  });

  it("sin APIFY_API_TOKEN devuelve una instancia de SerperProvider", () => {
    delete process.env.APIFY_API_TOKEN;
    delete process.env.SOURCING_PROVIDER;
    expect(getSourcingProvider()).toBeInstanceOf(SerperProvider);
  });

  it("con APIFY_API_TOKEN devuelve una instancia de HarvestApiProvider", async () => {
    process.env.APIFY_API_TOKEN = "test-token";
    delete process.env.SOURCING_PROVIDER;
    // El módulo cachea `instance` como singleton — reseteamos módulos para no arrastrar la
    // instancia que ya haya creado el test anterior. Reimportamos también `HarvestApiProvider`
    // en el mismo ciclo: tras `resetModules()` la clase importada arriba del archivo queda de
    // un registro de módulos viejo, y `instanceof` contra esa referencia stale siempre da
    // `false` aunque el objeto sea "la misma clase" en términos de código.
    vi.resetModules();
    const [fresh, freshHarvest] = await Promise.all([
      import("./get-sourcing-provider"),
      import("../data/harvest-api-provider"),
    ]);
    expect(fresh.getSourcingProvider()).toBeInstanceOf(freshHarvest.HarvestApiProvider);
  });
});

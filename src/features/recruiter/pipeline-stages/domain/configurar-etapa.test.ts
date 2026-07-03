import { describe, expect, test, vi } from "vitest";
import { configurarEtapa } from "./configurar-etapa";
import type { ConfigurarEtapaCtx, ConfigurarEtapaDeps } from "./configurar-etapa";

const ctx: ConfigurarEtapaCtx = { organizationId: "org-1", role: "recruiter" };
const makeUpsert = () => vi.fn().mockResolvedValue(undefined);
const deps = (upsert = makeUpsert()): ConfigurarEtapaDeps => ({ upsert });

describe("configurarEtapa", () => {
  test("rejects consultant role", async () => {
    const result = await configurarEtapa(
      { stageKey: "screening", isActive: false },
      { ...ctx, role: "consultant" },
      deps(),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/consultor/i);
  });

  test("cannot deactivate hired", async () => {
    const result = await configurarEtapa(
      { stageKey: "hired", isActive: false },
      ctx,
      deps(),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/desactivar/);
  });

  test("can deactivate rejected (etapa operativa, no de cierre)", async () => {
    const upsert = makeUpsert();
    const result = await configurarEtapa(
      { stageKey: "rejected", isActive: false },
      ctx,
      deps(upsert),
    );
    expect(result.ok).toBe(true);
    expect(upsert).toHaveBeenCalledWith("org-1", "rejected", { isActive: false });
  });

  test("rejects sla_days < 1", async () => {
    const result = await configurarEtapa(
      { stageKey: "screening", slaDays: 0 },
      ctx,
      deps(),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/SLA/);
  });

  test("rejects empty label override", async () => {
    const result = await configurarEtapa(
      { stageKey: "screening", labelOverride: "   " },
      ctx,
      deps(),
    );
    expect(result.ok).toBe(false);
  });

  test("deactivating non-terminal stage is allowed", async () => {
    const upsert = makeUpsert();
    const result = await configurarEtapa(
      { stageKey: "screening", isActive: false },
      ctx,
      deps(upsert),
    );
    expect(result.ok).toBe(true);
    expect(upsert).toHaveBeenCalledWith("org-1", "screening", { isActive: false });
  });

  test("persists sla_days and label together", async () => {
    const upsert = makeUpsert();
    const result = await configurarEtapa(
      { stageKey: "interview", slaDays: 7, labelOverride: "Entrevista técnica" },
      ctx,
      deps(upsert),
    );
    expect(result.ok).toBe(true);
    expect(upsert).toHaveBeenCalledWith("org-1", "interview", {
      slaDays: 7,
      labelOverride: "Entrevista técnica",
    });
  });

  test("admin role is allowed", async () => {
    const result = await configurarEtapa(
      { stageKey: "new", isActive: false },
      { ...ctx, role: "admin" },
      deps(),
    );
    expect(result.ok).toBe(true);
  });
});

import { describe, it, expect, vi } from "vitest";
import { moverEtapa } from "./mover-etapa";
import type { MoverEtapaDeps, MoverEtapaContext } from "./mover-etapa";
import type { ApplicationRow } from "./postular-candidato";

const makeApp = (overrides?: Partial<ApplicationRow>): ApplicationRow => ({
  id: "app-1",
  organizationId: "org-1",
  jobId: "job-1",
  candidateId: "cand-1",
  stage: "new",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeDeps = (app: ApplicationRow, overrides?: Partial<MoverEtapaDeps>): MoverEtapaDeps => ({
  getApplicationById: vi.fn().mockResolvedValue(app),
  updateApplicationStage: vi.fn().mockImplementation((_id, _fromStage, toStage) =>
    Promise.resolve({ ...app, stage: toStage }),
  ),
  ...overrides,
});

const ctx: MoverEtapaContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

describe("moverEtapa", () => {
  it("mueve la etapa correctamente", async () => {
    const app = makeApp({ stage: "new" });
    const deps = makeDeps(app);
    const result = await moverEtapa({ applicationId: "app-1", newStage: "screening" }, ctx, deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.stage).toBe("screening");
    // El historial necesita la etapa de origen: se la pasamos al data layer.
    expect(deps.updateApplicationStage).toHaveBeenCalledWith("app-1", "new", "screening");
  });

  it("rechaza si la application no existe en la org", async () => {
    const deps = makeDeps(makeApp(), {
      getApplicationById: vi.fn().mockResolvedValue(null),
    });
    const result = await moverEtapa({ applicationId: "app-1", newStage: "screening" }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrada/i);
  });

  it("rechaza si ya está en la misma etapa", async () => {
    const app = makeApp({ stage: "screening" });
    const deps = makeDeps(app);
    const result = await moverEtapa({ applicationId: "app-1", newStage: "screening" }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/ya está en esa etapa/i);
  });

  it("rechaza si la etapa actual es 'hired' (terminal)", async () => {
    const app = makeApp({ stage: "hired" });
    const deps = makeDeps(app);
    const result = await moverEtapa({ applicationId: "app-1", newStage: "offer" }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/hired/i);
  });

  it("rechaza si la etapa actual es 'rejected' (terminal)", async () => {
    const app = makeApp({ stage: "rejected" });
    const deps = makeDeps(app);
    const result = await moverEtapa({ applicationId: "app-1", newStage: "screening" }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/rejected/i);
  });

  it("permite mover a 'rejected' desde cualquier etapa no terminal", async () => {
    const app = makeApp({ stage: "interview" });
    const deps = makeDeps(app);
    const result = await moverEtapa({ applicationId: "app-1", newStage: "rejected" }, ctx, deps);
    expect(result.ok).toBe(true);
  });

  it("rechaza si el rol es consultant", async () => {
    const app = makeApp({ stage: "new" });
    const deps = makeDeps(app);
    const result = await moverEtapa(
      { applicationId: "app-1", newStage: "screening" },
      { ...ctx, role: "consultant" },
      deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/consultores/i);
  });
});

import { describe, it, expect, vi } from "vitest";
import { rechazarPostulacion } from "./rechazar-postulacion";
import type { RechazarPostulacionDeps, RechazarPostulacionContext } from "./rechazar-postulacion";
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

const makeDeps = (
  app: ApplicationRow,
  overrides?: Partial<RechazarPostulacionDeps>,
): RechazarPostulacionDeps => ({
  getApplicationById: vi.fn().mockResolvedValue(app),
  updateApplicationStage: vi
    .fn()
    .mockImplementation((_id, _fromStage, toStage) => Promise.resolve({ ...app, stage: toStage })),
  ...overrides,
});

const ctx: RechazarPostulacionContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

describe("rechazarPostulacion", () => {
  it("rechaza la postulación y guarda motivo + nota en el evento", async () => {
    const app = makeApp({ stage: "screening" });
    const deps = makeDeps(app);
    const result = await rechazarPostulacion(
      { applicationId: "app-1", reason: "pretension_salarial", note: "pidió +40%" },
      ctx,
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.stage).toBe("rejected");
    expect(deps.updateApplicationStage).toHaveBeenCalledWith("app-1", "screening", "rejected", {
      rejectionReason: "pretension_salarial",
      rejectionNote: "pidió +40%",
    });
  });

  it("rechaza si la application no existe en la org", async () => {
    const deps = makeDeps(makeApp(), {
      getApplicationById: vi.fn().mockResolvedValue(null),
    });
    const result = await rechazarPostulacion(
      { applicationId: "app-1", reason: "otro" },
      ctx,
      deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrada/i);
  });

  it("rechaza si ya está descartado", async () => {
    const app = makeApp({ stage: "rejected" });
    const deps = makeDeps(app);
    const result = await rechazarPostulacion(
      { applicationId: "app-1", reason: "otro" },
      ctx,
      deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/ya está descartado/i);
  });

  it("rechaza si la etapa actual es 'hired' (etapa de cierre)", async () => {
    const app = makeApp({ stage: "hired" });
    const deps = makeDeps(app);
    const result = await rechazarPostulacion(
      { applicationId: "app-1", reason: "otro" },
      ctx,
      deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/contratado/i);
  });

  it("rechaza si el rol es consultant", async () => {
    const app = makeApp({ stage: "new" });
    const deps = makeDeps(app);
    const result = await rechazarPostulacion(
      { applicationId: "app-1", reason: "otro" },
      { ...ctx, role: "consultant" },
      deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/consultores/i);
  });
});

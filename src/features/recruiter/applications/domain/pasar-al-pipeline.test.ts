import { describe, it, expect, vi } from "vitest";
import { pasarAlPipeline } from "./pasar-al-pipeline";
import type {
  InboxApplicationRow,
  PasarAlPipelineContext,
  PasarAlPipelineDeps,
} from "./pasar-al-pipeline";

const makeApp = (overrides?: Partial<InboxApplicationRow>): InboxApplicationRow => ({
  id: "app-1",
  organizationId: "org-1",
  jobId: "job-1",
  candidateId: "cand-1",
  stage: "new",
  pipelineEnteredAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeDeps = (
  app: InboxApplicationRow | null,
  overrides?: Partial<PasarAlPipelineDeps>,
): PasarAlPipelineDeps => ({
  getApplicationById: vi.fn().mockResolvedValue(app),
  getActiveStages: vi.fn().mockResolvedValue(["new", "screening", "interview", "offer", "hired"]),
  setPipelineEntered: vi.fn().mockImplementation((id, _from, toStage) => ({
    ...makeApp({ id, stage: toStage }),
  })),
  ...overrides,
});

const ctx: PasarAlPipelineContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

describe("pasarAlPipeline", () => {
  it("entra a la primera etapa activa cuando no se indica destino", async () => {
    const deps = makeDeps(makeApp());
    const res = await pasarAlPipeline({ applicationId: "app-1" }, ctx, deps);

    expect(res.ok).toBe(true);
    expect(deps.setPipelineEntered).toHaveBeenCalledWith("app-1", "new", "screening");
  });

  it("respeta la etapa destino pedida", async () => {
    const deps = makeDeps(makeApp());
    const res = await pasarAlPipeline({ applicationId: "app-1", toStage: "interview" }, ctx, deps);

    expect(res.ok).toBe(true);
    expect(deps.setPipelineEntered).toHaveBeenCalledWith("app-1", "new", "interview");
  });

  it("rechaza una etapa desactivada", async () => {
    const deps = makeDeps(makeApp(), {
      getActiveStages: vi.fn().mockResolvedValue(["new", "screening"]),
    });
    const res = await pasarAlPipeline({ applicationId: "app-1", toStage: "interview" }, ctx, deps);

    expect(res).toMatchObject({ ok: false });
    expect(deps.setPipelineEntered).not.toHaveBeenCalled();
  });

  it("nunca deja la postulación en la bandeja como destino", async () => {
    const deps = makeDeps(makeApp());
    const res = await pasarAlPipeline({ applicationId: "app-1", toStage: "new" }, ctx, deps);

    expect(res).toMatchObject({ ok: false });
    expect(deps.setPipelineEntered).not.toHaveBeenCalled();
  });

  it("no avanza dos veces la misma postulación", async () => {
    const deps = makeDeps(makeApp({ stage: "screening", pipelineEnteredAt: new Date() }));
    const res = await pasarAlPipeline({ applicationId: "app-1" }, ctx, deps);

    expect(res).toMatchObject({ ok: false, error: "El candidato ya está en el pipeline." });
    expect(deps.setPipelineEntered).not.toHaveBeenCalled();
  });

  it("no avanza un candidato descartado", async () => {
    const deps = makeDeps(makeApp({ stage: "rejected" }));
    const res = await pasarAlPipeline({ applicationId: "app-1" }, ctx, deps);

    expect(res).toMatchObject({ ok: false });
    expect(deps.setPipelineEntered).not.toHaveBeenCalled();
  });

  it("falla si no hay etapas activas más allá de la bandeja", async () => {
    const deps = makeDeps(makeApp(), {
      getActiveStages: vi.fn().mockResolvedValue(["new", "rejected"]),
    });
    const res = await pasarAlPipeline({ applicationId: "app-1" }, ctx, deps);

    expect(res).toMatchObject({ ok: false, error: "No hay etapas activas en el pipeline." });
  });

  it("el consultor no puede avanzar candidatos", async () => {
    const deps = makeDeps(makeApp());
    const res = await pasarAlPipeline({ applicationId: "app-1" }, { ...ctx, role: "consultant" }, deps);

    expect(res).toMatchObject({ ok: false });
    expect(deps.getApplicationById).not.toHaveBeenCalled();
  });

  it("falla si la postulación no existe", async () => {
    const deps = makeDeps(null);
    const res = await pasarAlPipeline({ applicationId: "app-1" }, ctx, deps);

    expect(res).toMatchObject({ ok: false, error: "Postulación no encontrada." });
  });
});

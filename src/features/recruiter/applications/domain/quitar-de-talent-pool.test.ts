import { describe, it, expect, vi } from "vitest";
import { quitarDeTalentPool } from "./quitar-de-talent-pool";
import type {
  QuitarDeTalentPoolContext,
  QuitarDeTalentPoolDeps,
} from "./quitar-de-talent-pool";
import type { InboxApplicationRow } from "./pasar-al-pipeline";

const makeApp = (
  overrides?: Partial<InboxApplicationRow>,
): InboxApplicationRow => ({
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
  savedToPool: boolean | null,
  overrides?: Partial<QuitarDeTalentPoolDeps>,
): QuitarDeTalentPoolDeps => ({
  getApplicationById: vi.fn().mockResolvedValue(app),
  getCandidateSavedToPool: vi.fn().mockResolvedValue(savedToPool),
  setSavedToPool: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const ctx: QuitarDeTalentPoolContext = {
  organizationId: "org-1",
  role: "recruiter",
};

describe("quitarDeTalentPool", () => {
  it("saca al candidato del pool (setSavedToPool con false)", async () => {
    const deps = makeDeps(makeApp(), true);
    const res = await quitarDeTalentPool({ applicationId: "app-1" }, ctx, deps);

    expect(res).toMatchObject({ ok: true, data: { candidateId: "cand-1" } });
    expect(deps.setSavedToPool).toHaveBeenCalledWith("cand-1", false);
  });

  it("no-op con error si el candidato no está en el pool (nada que deshacer)", async () => {
    const deps = makeDeps(makeApp(), false);
    const res = await quitarDeTalentPool({ applicationId: "app-1" }, ctx, deps);

    expect(res).toMatchObject({
      ok: false,
      error: "El candidato no está en tu pool de candidatos.",
    });
    expect(deps.setSavedToPool).not.toHaveBeenCalled();
  });

  it("postulación no encontrada", async () => {
    const deps = makeDeps(null, null);
    const res = await quitarDeTalentPool({ applicationId: "app-1" }, ctx, deps);
    expect(res).toMatchObject({ ok: false, error: "Postulación no encontrada." });
  });

  it("candidato no encontrado", async () => {
    const deps = makeDeps(makeApp(), null);
    const res = await quitarDeTalentPool({ applicationId: "app-1" }, ctx, deps);
    expect(res).toMatchObject({ ok: false, error: "Candidato no encontrado." });
  });

  it("el consultor no puede tocar el pool", async () => {
    const deps = makeDeps(makeApp(), true);
    const res = await quitarDeTalentPool(
      { applicationId: "app-1" },
      { ...ctx, role: "consultant" },
      deps,
    );

    expect(res).toMatchObject({ ok: false });
    expect(deps.getApplicationById).not.toHaveBeenCalled();
    expect(deps.setSavedToPool).not.toHaveBeenCalled();
  });
});

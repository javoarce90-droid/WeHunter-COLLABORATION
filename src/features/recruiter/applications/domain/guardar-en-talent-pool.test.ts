import { describe, it, expect, vi } from "vitest";
import { guardarEnTalentPool } from "./guardar-en-talent-pool";
import type {
  GuardarEnTalentPoolContext,
  GuardarEnTalentPoolDeps,
} from "./guardar-en-talent-pool";
import type { InboxApplicationRow } from "./pasar-al-pipeline";

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
  savedToPool: boolean | null,
  overrides?: Partial<GuardarEnTalentPoolDeps>,
): GuardarEnTalentPoolDeps => ({
  getApplicationById: vi.fn().mockResolvedValue(app),
  getCandidateSavedToPool: vi.fn().mockResolvedValue(savedToPool),
  setSavedToPool: vi.fn().mockResolvedValue(undefined),
  insertNote: vi.fn().mockResolvedValue({ noteId: "note-1" }),
  ...overrides,
});

const ctx: GuardarEnTalentPoolContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

describe("guardarEnTalentPool", () => {
  it("suma al candidato al pool sin tocar la postulación", async () => {
    const deps = makeDeps(makeApp(), false);
    const res = await guardarEnTalentPool({ applicationId: "app-1" }, ctx, deps);

    expect(res).toMatchObject({ ok: true, data: { candidateId: "cand-1" } });
    expect(deps.setSavedToPool).toHaveBeenCalledWith("cand-1");
  });

  it("deja la nota del recruiter como nota real del timeline", async () => {
    const deps = makeDeps(makeApp(), false);
    await guardarEnTalentPool(
      { applicationId: "app-1", note: "Buen perfil, otra búsqueda" },
      ctx,
      deps,
    );

    expect(deps.insertNote).toHaveBeenCalledWith({
      organizationId: "org-1",
      applicationId: "app-1",
      body: "Buen perfil, otra búsqueda",
      createdBy: "user-1",
    });
  });

  it("no agrega nota si no se manda una", async () => {
    const deps = makeDeps(makeApp(), false);
    await guardarEnTalentPool({ applicationId: "app-1" }, ctx, deps);
    expect(deps.insertNote).not.toHaveBeenCalled();
  });

  it("no vuelve a guardar un candidato que ya es parte del pool", async () => {
    const deps = makeDeps(makeApp(), true);
    const res = await guardarEnTalentPool({ applicationId: "app-1" }, ctx, deps);

    expect(res).toMatchObject({
      ok: false,
      error: "El candidato ya es parte de tu pool de candidatos.",
    });
    expect(deps.setSavedToPool).not.toHaveBeenCalled();
  });

  it("postulación no encontrada", async () => {
    const deps = makeDeps(null, null);
    const res = await guardarEnTalentPool({ applicationId: "app-1" }, ctx, deps);
    expect(res).toMatchObject({ ok: false, error: "Postulación no encontrada." });
  });

  it("el consultor no puede guardar en el pool", async () => {
    const deps = makeDeps(makeApp(), false);
    const res = await guardarEnTalentPool(
      { applicationId: "app-1" },
      { ...ctx, role: "consultant" },
      deps,
    );

    expect(res).toMatchObject({ ok: false });
    expect(deps.getApplicationById).not.toHaveBeenCalled();
    expect(deps.setSavedToPool).not.toHaveBeenCalled();
  });
});

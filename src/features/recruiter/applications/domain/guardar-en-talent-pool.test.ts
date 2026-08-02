import { describe, it, expect, vi } from "vitest";
import { guardarEnTalentPool } from "./guardar-en-talent-pool";
import type {
  GuardarEnTalentPoolContext,
  GuardarEnTalentPoolDeps,
} from "./guardar-en-talent-pool";
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
  app: ApplicationRow | null,
  overrides?: Partial<GuardarEnTalentPoolDeps>,
): GuardarEnTalentPoolDeps => ({
  getApplicationById: vi.fn().mockResolvedValue(app),
  updateApplicationStage: vi
    .fn()
    .mockImplementation((id, _from, toStage) => makeApp({ id, stage: toStage })),
  setTalentState: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const ctx: GuardarEnTalentPoolContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

describe("guardarEnTalentPool", () => {
  it("cierra la postulación y marca al candidato como talento activo", async () => {
    const deps = makeDeps(makeApp());
    const res = await guardarEnTalentPool({ applicationId: "app-1" }, ctx, deps);

    expect(res.ok).toBe(true);
    expect(deps.updateApplicationStage).toHaveBeenCalledWith(
      "app-1",
      "new",
      "rejected",
      { rejectionReason: "perfil_no_ajusta", rejectionNote: undefined },
    );
    expect(deps.setTalentState).toHaveBeenCalledWith("cand-1", "active");
  });

  it("deja la nota del recruiter en el evento del descarte", async () => {
    const deps = makeDeps(makeApp());
    await guardarEnTalentPool({ applicationId: "app-1", note: "Buen perfil, otra búsqueda" }, ctx, deps);

    expect(deps.updateApplicationStage).toHaveBeenCalledWith(
      "app-1",
      "new",
      "rejected",
      { rejectionReason: "perfil_no_ajusta", rejectionNote: "Buen perfil, otra búsqueda" },
    );
  });

  it("no toca el pool si la postulación no se pudo cerrar", async () => {
    const deps = makeDeps(makeApp({ stage: "hired" }));
    const res = await guardarEnTalentPool({ applicationId: "app-1" }, ctx, deps);

    expect(res).toMatchObject({ ok: false });
    expect(deps.setTalentState).not.toHaveBeenCalled();
  });

  it("no vuelve a guardar un candidato ya descartado", async () => {
    const deps = makeDeps(makeApp({ stage: "rejected" }));
    const res = await guardarEnTalentPool({ applicationId: "app-1" }, ctx, deps);

    expect(res).toMatchObject({ ok: false, error: "El candidato ya está descartado." });
    expect(deps.setTalentState).not.toHaveBeenCalled();
  });

  it("el consultor no puede guardar en el pool", async () => {
    const deps = makeDeps(makeApp());
    const res = await guardarEnTalentPool(
      { applicationId: "app-1" },
      { ...ctx, role: "consultant" },
      deps,
    );

    expect(res).toMatchObject({ ok: false });
    expect(deps.updateApplicationStage).not.toHaveBeenCalled();
    expect(deps.setTalentState).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from "vitest";
import { moverAEtapa, legacyStageFor } from "./mover-a-etapa";
import type { MoverAEtapaContext, MoverAEtapaDeps, ApplicationEnPipeline } from "./mover-a-etapa";

const ctx: MoverAEtapaContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

const app: ApplicationEnPipeline = {
  id: "app-1",
  jobId: "job-1",
  stageId: "s-screen",
  stageKind: "in_process",
};

const destino = {
  id: "s-interview",
  jobId: "job-1",
  name: "Entrevista",
  position: 2,
  slaDays: null,
  kind: "in_process" as const,
};

const makeDeps = (over: Partial<MoverAEtapaDeps> = {}): MoverAEtapaDeps => ({
  getApplication: vi.fn().mockResolvedValue(app),
  getStage: vi.fn().mockResolvedValue(destino),
  moveToStage: vi.fn().mockResolvedValue(undefined),
  ...over,
});

describe("moverAEtapa", () => {
  it("mueve dentro de la misma búsqueda", async () => {
    const d = makeDeps();
    const res = await moverAEtapa({ applicationId: "app-1", toStageId: "s-interview" }, ctx, d);

    expect(res.ok).toBe(true);
    expect(d.moveToStage).toHaveBeenCalledWith({
      applicationId: "app-1",
      toStageId: "s-interview",
      legacyStage: "screening",
    });
  });

  it("no deja mover a una etapa de OTRA búsqueda", async () => {
    const d = makeDeps({
      getStage: vi.fn().mockResolvedValue({ ...destino, jobId: "job-999" }),
    });
    const res = await moverAEtapa({ applicationId: "app-1", toStageId: "s-ajena" }, ctx, d);

    expect(res).toMatchObject({ ok: false, error: "Esa etapa pertenece a otra búsqueda." });
    expect(d.moveToStage).not.toHaveBeenCalled();
  });

  it("no mueve a la etapa donde ya está", async () => {
    const d = makeDeps();
    const res = await moverAEtapa({ applicationId: "app-1", toStageId: "s-screen" }, ctx, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.moveToStage).not.toHaveBeenCalled();
  });

  it("no saca a un candidato ya contratado", async () => {
    const d = makeDeps({
      getApplication: vi.fn().mockResolvedValue({ ...app, stageKind: "hired" }),
    });
    const res = await moverAEtapa({ applicationId: "app-1", toStageId: "s-interview" }, ctx, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.moveToStage).not.toHaveBeenCalled();
  });

  it("falla si la etapa destino no existe", async () => {
    const d = makeDeps({ getStage: vi.fn().mockResolvedValue(null) });
    const res = await moverAEtapa({ applicationId: "app-1", toStageId: "nope" }, ctx, d);

    expect(res).toMatchObject({ ok: false, error: "Etapa no encontrada." });
  });

  it("un rol sin la capacidad no mueve nada", async () => {
    const d = makeDeps();
    const res = await moverAEtapa(
      { applicationId: "app-1", toStageId: "s-interview" },
      { ...ctx, role: "viewer" },
      d,
    );

    expect(res).toMatchObject({ ok: false });
    expect(d.getApplication).not.toHaveBeenCalled();
  });
});

describe("legacyStageFor", () => {
  it("usa la etapa original cuando la etapa vino del enum", () => {
    expect(
      legacyStageFor({ ...destino, legacyStage: "interview_tech" }),
    ).toBe("interview_tech");
  });

  it("deriva del kind para etapas creadas por el recruiter", () => {
    expect(legacyStageFor({ ...destino, kind: "in_process" })).toBe("screening");
    expect(legacyStageFor({ ...destino, kind: "inbox" })).toBe("new");
    expect(legacyStageFor({ ...destino, kind: "offer" })).toBe("offer");
    expect(legacyStageFor({ ...destino, kind: "hired" })).toBe("hired");
    expect(legacyStageFor({ ...destino, kind: "rejected" })).toBe("rejected");
  });
});

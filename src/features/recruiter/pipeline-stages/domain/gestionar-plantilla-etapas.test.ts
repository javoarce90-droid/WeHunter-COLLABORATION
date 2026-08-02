import { describe, it, expect, vi } from "vitest";
import {
  agregarEtapaPlantilla,
  renombrarEtapaPlantilla,
  configurarSlaPlantilla,
  eliminarEtapaPlantilla,
  reordenarPlantilla,
  generarPlantillaPorDefecto,
  buildDefaultStageTemplate,
} from "./gestionar-plantilla-etapas";
import type { PlantillaCtx } from "./gestionar-plantilla-etapas";
import type { JobStage } from "../schema";

const ctx: PlantillaCtx = { organizationId: "org-1", role: "recruiter" };
const ctxSinPermiso: PlantillaCtx = { organizationId: "org-1", role: "viewer" };

const stages: JobStage[] = [
  { id: "s-inbox", name: "Postulados", position: 0, slaDays: null, kind: "inbox" },
  { id: "s-screen", name: "Screening", position: 1, slaDays: null, kind: "in_process" },
  { id: "s-offer", name: "Oferta", position: 2, slaDays: null, kind: "offer" },
  { id: "s-hired", name: "Contratado", position: 3, slaDays: null, kind: "hired" },
  { id: "s-rej", name: "Descartado", position: 4, slaDays: null, kind: "rejected" },
];

describe("agregarEtapaPlantilla", () => {
  const deps = (over = {}) => ({
    listStages: vi.fn().mockResolvedValue(stages),
    insertStage: vi.fn().mockResolvedValue({ id: "s-nueva" }),
    ...over,
  });

  it("inserta la etapa antes de las de cierre", async () => {
    const d = deps();
    const res = await agregarEtapaPlantilla({ name: "Challenge Técnico" }, ctx, d);

    expect(res.ok).toBe(true);
    expect(d.insertStage).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Challenge Técnico", position: 2 }),
    );
  });

  it("rechaza nombres duplicados sin distinguir mayúsculas", async () => {
    const d = deps();
    const res = await agregarEtapaPlantilla({ name: "screening" }, ctx, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.insertStage).not.toHaveBeenCalled();
  });

  it("un rol sin permiso no configura la plantilla", async () => {
    const d = deps();
    const res = await agregarEtapaPlantilla({ name: "Challenge" }, ctxSinPermiso, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.listStages).not.toHaveBeenCalled();
  });
});

describe("renombrarEtapaPlantilla", () => {
  const deps = (stage: JobStage | null, over = {}) => ({
    getStage: vi.fn().mockResolvedValue(stage),
    listStages: vi.fn().mockResolvedValue(stages),
    renameStage: vi.fn().mockResolvedValue(undefined),
    ...over,
  });

  it("renombra una etapa del proceso", async () => {
    const d = deps(stages[1]);
    const res = await renombrarEtapaPlantilla({ stageId: "s-screen", name: "Preselección" }, ctx, d);

    expect(res.ok).toBe(true);
    expect(d.renameStage).toHaveBeenCalledWith("s-screen", "Preselección");
  });

  it("no permite chocar con el nombre de otra etapa", async () => {
    const d = deps(stages[1]);
    const res = await renombrarEtapaPlantilla({ stageId: "s-screen", name: "Oferta" }, ctx, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.renameStage).not.toHaveBeenCalled();
  });
});

describe("configurarSlaPlantilla", () => {
  const deps = (stage: JobStage | null, over = {}) => ({
    getStage: vi.fn().mockResolvedValue(stage),
    setSla: vi.fn().mockResolvedValue(undefined),
    ...over,
  });

  it("configura el SLA de una etapa", async () => {
    const d = deps(stages[1]);
    const res = await configurarSlaPlantilla({ stageId: "s-screen", slaDays: 3 }, ctx, d);

    expect(res.ok).toBe(true);
    expect(d.setSla).toHaveBeenCalledWith("s-screen", 3);
  });

  it("rechaza un SLA menor a 1 día", async () => {
    const d = deps(stages[1]);
    const res = await configurarSlaPlantilla({ stageId: "s-screen", slaDays: 0 }, ctx, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.setSla).not.toHaveBeenCalled();
  });
});

describe("eliminarEtapaPlantilla", () => {
  const deps = (stage: JobStage | null, over = {}) => ({
    getStage: vi.fn().mockResolvedValue(stage),
    deleteStage: vi.fn().mockResolvedValue(undefined),
    ...over,
  });

  it("elimina una etapa intermedia", async () => {
    const d = deps(stages[1]);
    const res = await eliminarEtapaPlantilla({ stageId: "s-screen" }, ctx, d);

    expect(res.ok).toBe(true);
    expect(d.deleteStage).toHaveBeenCalledWith("s-screen");
  });

  it.each([
    ["inbox", "s-inbox"],
    ["hired", "s-hired"],
    ["rejected", "s-rej"],
  ])("no deja eliminar la etapa de tipo %s", async (kind, id) => {
    const stage = stages.find((s) => s.id === id)!;
    const d = deps(stage);
    const res = await eliminarEtapaPlantilla({ stageId: id }, ctx, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.deleteStage).not.toHaveBeenCalled();
  });
});

describe("reordenarPlantilla", () => {
  const deps = (over = {}) => ({
    listStages: vi.fn().mockResolvedValue(stages),
    setPositions: vi.fn().mockResolvedValue(undefined),
    ...over,
  });

  it("asigna posiciones según el orden recibido", async () => {
    const d = deps();
    const orden = ["s-inbox", "s-offer", "s-screen", "s-hired", "s-rej"];
    const res = await reordenarPlantilla({ stageIds: orden }, ctx, d);

    expect(res.ok).toBe(true);
    expect(d.setPositions).toHaveBeenCalledWith(orden.map((stageId, position) => ({ stageId, position })));
  });

  it("rechaza un orden al que le falta una etapa", async () => {
    const d = deps();
    const res = await reordenarPlantilla({ stageIds: ["s-inbox", "s-screen"] }, ctx, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.setPositions).not.toHaveBeenCalled();
  });
});

describe("generarPlantillaPorDefecto", () => {
  const deps = (over = {}) => ({
    listStages: vi.fn().mockResolvedValue([]),
    replaceTemplate: vi.fn().mockResolvedValue(undefined),
    ...over,
  });

  it("genera la plantilla por defecto si la organización no tiene ninguna", async () => {
    const d = deps();
    const res = await generarPlantillaPorDefecto(ctx, d);

    expect(res.ok).toBe(true);
    expect(d.replaceTemplate).toHaveBeenCalledWith("org-1", buildDefaultStageTemplate());
  });

  it("rechaza si la organización ya tiene una plantilla", async () => {
    const d = deps({ listStages: vi.fn().mockResolvedValue(stages) });
    const res = await generarPlantillaPorDefecto(ctx, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.replaceTemplate).not.toHaveBeenCalled();
  });

  it("un rol sin permiso no puede generarla", async () => {
    const d = deps();
    const res = await generarPlantillaPorDefecto(ctxSinPermiso, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.replaceTemplate).not.toHaveBeenCalled();
  });
});

describe("buildDefaultStageTemplate", () => {
  it("siempre incluye bandeja, oferta, contratado y descartado fijos", () => {
    const template = buildDefaultStageTemplate();
    expect(template[0]).toMatchObject({ name: "Postulados", kind: "inbox", position: 0 });
    expect(template.at(-3)).toMatchObject({ kind: "offer" });
    expect(template.at(-2)).toMatchObject({ kind: "hired" });
    expect(template.at(-1)).toMatchObject({ kind: "rejected" });
  });
});

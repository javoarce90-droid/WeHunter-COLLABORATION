import { describe, it, expect, vi } from "vitest";
import {
  agregarEtapa,
  renombrarEtapa,
  eliminarEtapa,
  reordenarEtapas,
  configurarSlaEtapaBusqueda,
} from "./gestionar-etapas-busqueda";
import type { EtapasCtx } from "./gestionar-etapas-busqueda";
import type { JobStage } from "../schema";

const ctx: EtapasCtx = { organizationId: "org-1", role: "recruiter" };
const ctxSinPermiso: EtapasCtx = { organizationId: "org-1", role: "viewer" };

const stages: JobStage[] = [
  { id: "s-inbox", name: "Postulados", position: 0, slaDays: null, kind: "inbox" },
  { id: "s-screen", name: "Screening", position: 1, slaDays: null, kind: "in_process" },
  { id: "s-offer", name: "Oferta", position: 2, slaDays: null, kind: "offer" },
  { id: "s-hired", name: "Contratado", position: 3, slaDays: null, kind: "hired" },
  { id: "s-rej", name: "Descartado", position: 4, slaDays: null, kind: "rejected" },
];

describe("agregarEtapa", () => {
  const deps = (over = {}) => ({
    listStages: vi.fn().mockResolvedValue(stages),
    insertStage: vi.fn().mockResolvedValue({ id: "s-nueva" }),
    ...over,
  });

  it("inserta la etapa antes de las de cierre", async () => {
    const d = deps();
    const res = await agregarEtapa({ jobId: "job-1", name: "Challenge Técnico" }, ctx, d);

    expect(res.ok).toBe(true);
    expect(d.insertStage).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Challenge Técnico", position: 2 }),
    );
  });

  it("rechaza nombres duplicados sin distinguir mayúsculas", async () => {
    const d = deps();
    const res = await agregarEtapa({ jobId: "job-1", name: "screening" }, ctx, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.insertStage).not.toHaveBeenCalled();
  });

  it("rechaza nombres demasiado cortos", async () => {
    const d = deps();
    expect(await agregarEtapa({ jobId: "job-1", name: "X" }, ctx, d)).toMatchObject({ ok: false });
  });

  it("corta al llegar al máximo de etapas", async () => {
    const muchas = Array.from({ length: 15 }, (_, i) => ({
      ...stages[1],
      id: `s-${i}`,
      name: `Etapa ${i}`,
    }));
    const d = deps({ listStages: vi.fn().mockResolvedValue(muchas) });
    const res = await agregarEtapa({ jobId: "job-1", name: "Una más" }, ctx, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.insertStage).not.toHaveBeenCalled();
  });

  it("un rol sin permiso no configura el pipeline", async () => {
    const d = deps();
    const res = await agregarEtapa({ jobId: "job-1", name: "Challenge" }, ctxSinPermiso, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.listStages).not.toHaveBeenCalled();
  });

  it("acepta un SLA opcional en el mismo paso", async () => {
    const d = deps();
    const res = await agregarEtapa(
      { jobId: "job-1", name: "Challenge Técnico", slaDays: 3 },
      ctx,
      d,
    );

    expect(res.ok).toBe(true);
    expect(d.insertStage).toHaveBeenCalledWith(expect.objectContaining({ slaDays: 3 }));
  });

  it("sin SLA sigue funcionando como antes (queda null)", async () => {
    const d = deps();
    const res = await agregarEtapa({ jobId: "job-1", name: "Challenge Técnico" }, ctx, d);

    expect(res.ok).toBe(true);
    expect(d.insertStage).toHaveBeenCalledWith(expect.objectContaining({ slaDays: null }));
  });

  it("rechaza un SLA menor a 1 día al agregar", async () => {
    const d = deps();
    const res = await agregarEtapa(
      { jobId: "job-1", name: "Challenge Técnico", slaDays: 0 },
      ctx,
      d,
    );

    expect(res).toMatchObject({ ok: false });
    expect(d.insertStage).not.toHaveBeenCalled();
  });
});

describe("renombrarEtapa", () => {
  const deps = (stage: (JobStage & { jobId: string }) | null, over = {}) => ({
    getStage: vi.fn().mockResolvedValue(stage),
    listStages: vi.fn().mockResolvedValue(stages),
    renameStage: vi.fn().mockResolvedValue(undefined),
    ...over,
  });

  it("renombra una etapa del proceso", async () => {
    const d = deps({ ...stages[1], jobId: "job-1" });
    const res = await renombrarEtapa({ stageId: "s-screen", name: "Preselección" }, ctx, d);

    expect(res.ok).toBe(true);
    expect(d.renameStage).toHaveBeenCalledWith("s-screen", "Preselección");
  });

  it("no permite chocar con el nombre de otra etapa", async () => {
    const d = deps({ ...stages[1], jobId: "job-1" });
    const res = await renombrarEtapa({ stageId: "s-screen", name: "Oferta" }, ctx, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.renameStage).not.toHaveBeenCalled();
  });

  it("deja renombrar con el mismo nombre que ya tenía", async () => {
    const d = deps({ ...stages[1], jobId: "job-1" });
    const res = await renombrarEtapa({ stageId: "s-screen", name: "Screening" }, ctx, d);

    expect(res.ok).toBe(true);
  });
});

describe("eliminarEtapa", () => {
  const deps = (stage: (JobStage & { jobId: string }) | null, ocupada = 0, over = {}) => ({
    getStage: vi.fn().mockResolvedValue(stage),
    countApplications: vi.fn().mockResolvedValue(ocupada),
    deleteStage: vi.fn().mockResolvedValue(undefined),
    ...over,
  });

  it("elimina una etapa intermedia vacía", async () => {
    const d = deps({ ...stages[1], jobId: "job-1" });
    const res = await eliminarEtapa({ stageId: "s-screen" }, ctx, d);

    expect(res.ok).toBe(true);
    expect(d.deleteStage).toHaveBeenCalledWith("s-screen");
  });

  it.each([
    ["inbox", "s-inbox"],
    ["hired", "s-hired"],
    ["rejected", "s-rej"],
  ])("no deja eliminar la etapa de tipo %s", async (kind, id) => {
    const stage = stages.find((s) => s.id === id)!;
    const d = deps({ ...stage, jobId: "job-1" });
    const res = await eliminarEtapa({ stageId: id }, ctx, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.deleteStage).not.toHaveBeenCalled();
  });

  it("no deja eliminar una etapa con candidatos adentro", async () => {
    const d = deps({ ...stages[1], jobId: "job-1" }, 3);
    const res = await eliminarEtapa({ stageId: "s-screen" }, ctx, d);

    expect(res).toMatchObject({ ok: false });
    if (!res.ok) expect(res.error).toMatch(/3 candidatos/);
    expect(d.deleteStage).not.toHaveBeenCalled();
  });
});

describe("configurarSlaEtapaBusqueda", () => {
  const deps = (stage: (JobStage & { jobId: string }) | null, over = {}) => ({
    getStage: vi.fn().mockResolvedValue(stage),
    setSla: vi.fn().mockResolvedValue(undefined),
    ...over,
  });

  it("configura el SLA de una etapa", async () => {
    const d = deps({ ...stages[1], jobId: "job-1" });
    const res = await configurarSlaEtapaBusqueda({ stageId: "s-screen", slaDays: 3 }, ctx, d);

    expect(res.ok).toBe(true);
    expect(d.setSla).toHaveBeenCalledWith("s-screen", 3);
  });

  it("permite quitar el SLA (null)", async () => {
    const d = deps({ ...stages[1], jobId: "job-1" });
    const res = await configurarSlaEtapaBusqueda({ stageId: "s-screen", slaDays: null }, ctx, d);

    expect(res.ok).toBe(true);
    expect(d.setSla).toHaveBeenCalledWith("s-screen", null);
  });

  it("rechaza un SLA menor a 1 día", async () => {
    const d = deps({ ...stages[1], jobId: "job-1" });
    const res = await configurarSlaEtapaBusqueda({ stageId: "s-screen", slaDays: 0 }, ctx, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.setSla).not.toHaveBeenCalled();
  });

  it("etapa no encontrada", async () => {
    const d = deps(null);
    const res = await configurarSlaEtapaBusqueda({ stageId: "s-inexistente", slaDays: 3 }, ctx, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.setSla).not.toHaveBeenCalled();
  });

  it("un rol sin permiso no configura SLA", async () => {
    const d = deps({ ...stages[1], jobId: "job-1" });
    const res = await configurarSlaEtapaBusqueda({ stageId: "s-screen", slaDays: 3 }, ctxSinPermiso, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.getStage).not.toHaveBeenCalled();
  });
});

describe("reordenarEtapas", () => {
  const deps = (over = {}) => ({
    listStages: vi.fn().mockResolvedValue(stages),
    setPositions: vi.fn().mockResolvedValue(undefined),
    ...over,
  });

  it("asigna posiciones según el orden recibido", async () => {
    const d = deps();
    const orden = ["s-inbox", "s-offer", "s-screen", "s-hired", "s-rej"];
    const res = await reordenarEtapas({ jobId: "job-1", stageIds: orden }, ctx, d);

    expect(res.ok).toBe(true);
    expect(d.setPositions).toHaveBeenCalledWith(
      orden.map((stageId, position) => ({ stageId, position })),
    );
  });

  it("rechaza un orden al que le falta una etapa", async () => {
    const d = deps();
    const res = await reordenarEtapas({ jobId: "job-1", stageIds: ["s-inbox", "s-screen"] }, ctx, d);

    expect(res).toMatchObject({ ok: false });
    expect(d.setPositions).not.toHaveBeenCalled();
  });

  it("rechaza un orden con una etapa de otra búsqueda", async () => {
    const d = deps();
    const res = await reordenarEtapas(
      { jobId: "job-1", stageIds: ["s-inbox", "s-screen", "s-offer", "s-hired", "s-intrusa"] },
      ctx,
      d,
    );

    expect(res).toMatchObject({ ok: false });
    expect(d.setPositions).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from "vitest";
import { obtenerKpis, type ObtenerKpisDeps } from "./obtener-kpis";

function makeDeps(over: Partial<{
  jobs: { total: number; open: number };
  candidates: number;
  byStage: Record<string, number>;
  pendingCount: number;
  hiredThisMonth: number;
  activeMembersCount: number;
}> = {}): ObtenerKpisDeps {
  return {
    getCounts: vi.fn(async () => ({
      jobs: over.jobs ?? { total: 0, open: 0 },
      candidates: over.candidates ?? 0,
      byStage: over.byStage ?? {},
      pendingCount: over.pendingCount ?? 0,
      hiredThisMonth: over.hiredThisMonth ?? 0,
      activeMembersCount: over.activeMembersCount ?? 0,
    })),
  };
}

const ZERO_FUNNEL = [
  { stage: "new", count: 0 },
  { stage: "screening", count: 0 },
  { stage: "interview", count: 0 },
  { stage: "interview_hr", count: 0 },
  { stage: "interview_tech", count: 0 },
  { stage: "interview_client", count: 0 },
  { stage: "offer", count: 0 },
  { stage: "hired", count: 0 },
  { stage: "rejected", count: 0 },
];

describe("obtenerKpis", () => {
  it("falla si no hay organization activa", async () => {
    const deps = makeDeps();
    const res = await obtenerKpis({ organizationId: null }, deps);

    expect(res.ok).toBe(false);
    expect(deps.getCounts).not.toHaveBeenCalled();
  });

  it("postulaciones activas excluye hired y rejected", async () => {
    const deps = makeDeps({
      byStage: { new: 3, screening: 2, interview: 1, offer: 1, hired: 4, rejected: 5 },
    });
    const res = await obtenerKpis({ organizationId: "org-1" }, deps);

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // total = 16, cerradas = hired(4)+rejected(5)=9 → activas = 7
    expect(res.data.postulacionesActivas).toBe(7);
    expect(res.data.contrataciones).toBe(4);
  });

  it("en pipeline = activas menos las que siguen sin revisar", async () => {
    const deps = makeDeps({
      byStage: { new: 3, screening: 2, interview: 1 },
      pendingCount: 3,
    });
    const res = await obtenerKpis({ organizationId: "org-1" }, deps);

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // activas = 6, pendientes = 3 → en pipeline = 3
    expect(res.data.pendienteRevision).toBe(3);
    expect(res.data.enPipeline).toBe(3);
  });

  it("pasa contrataciones del mes y miembros activos tal cual", async () => {
    const deps = makeDeps({ hiredThisMonth: 2, activeMembersCount: 4 });
    const res = await obtenerKpis({ organizationId: "org-1" }, deps);

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.contratacionesMes).toBe(2);
    expect(res.data.activeMembersCount).toBe(4);
  });

  it("mapea búsquedas y pool, y maneja etapas ausentes", async () => {
    const deps = makeDeps({
      jobs: { total: 5, open: 2 },
      candidates: 12,
      byStage: { new: 2 },
    });
    const res = await obtenerKpis({ organizationId: "org-1" }, deps);

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toEqual({
      busquedasAbiertas: 2,
      busquedasTotales: 5,
      candidatosEnPool: 12,
      postulacionesActivas: 2,
      postulacionesTotales: 2,
      contrataciones: 0,
      pendienteRevision: 0,
      enPipeline: 2,
      contratacionesMes: 0,
      activeMembersCount: 0,
      funnel: [
        { stage: "new", count: 2 },
        { stage: "screening", count: 0 },
        { stage: "interview", count: 0 },
        { stage: "interview_hr", count: 0 },
        { stage: "interview_tech", count: 0 },
        { stage: "interview_client", count: 0 },
        { stage: "offer", count: 0 },
        { stage: "hired", count: 0 },
        { stage: "rejected", count: 0 },
      ],
    });
  });

  it("todo en cero cuando no hay datos", async () => {
    const res = await obtenerKpis({ organizationId: "org-1" }, makeDeps());

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toEqual({
      busquedasAbiertas: 0,
      busquedasTotales: 0,
      candidatosEnPool: 0,
      postulacionesActivas: 0,
      postulacionesTotales: 0,
      contrataciones: 0,
      pendienteRevision: 0,
      enPipeline: 0,
      contratacionesMes: 0,
      activeMembersCount: 0,
      funnel: ZERO_FUNNEL,
    });
  });
});

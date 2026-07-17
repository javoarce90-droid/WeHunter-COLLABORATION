import { describe, it, expect, vi } from "vitest";
import { aprobarRequisition } from "./aprobar-requisition";
import type { AprobarRequisitionCtx, AprobarRequisitionDeps } from "./aprobar-requisition";

const makeDeps = (overrides?: Partial<AprobarRequisitionDeps>): AprobarRequisitionDeps => ({
  getRequisitionStatus: vi.fn().mockResolvedValue({ id: "req-1", status: "pending" }),
  approveAndCreateJob: vi.fn().mockResolvedValue({ jobId: "job-1" }),
  ...overrides,
});

const ctx: AprobarRequisitionCtx = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

const input = { requisitionId: "req-1" };

describe("aprobarRequisition", () => {
  it("aprueba una solicitud pendiente y devuelve el job creado", async () => {
    const deps = makeDeps();
    const result = await aprobarRequisition(input, ctx, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.jobId).toBe("job-1");
    expect(deps.approveAndCreateJob).toHaveBeenCalledWith({
      requisitionId: "req-1",
      organizationId: "org-1",
      reviewedBy: "user-1",
      reviewNote: null,
    });
  });

  it("pasa el comentario al cliente si lo hay", async () => {
    const deps = makeDeps();
    await aprobarRequisition({ ...input, reviewNote: "  Arrancamos el lunes.  " }, ctx, deps);
    expect(vi.mocked(deps.approveAndCreateJob).mock.calls[0]![0].reviewNote).toBe(
      "Arrancamos el lunes.",
    );
  });

  it("no aprueba dos veces la misma solicitud", async () => {
    const deps = makeDeps({
      getRequisitionStatus: vi.fn().mockResolvedValue({ id: "req-1", status: "approved" }),
    });
    const result = await aprobarRequisition(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/ya fue revisada/i);
    expect(deps.approveAndCreateJob).not.toHaveBeenCalled();
  });

  it("no aprueba una solicitud de otra organización", async () => {
    const deps = makeDeps({ getRequisitionStatus: vi.fn().mockResolvedValue(null) });
    const result = await aprobarRequisition(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrada/i);
    expect(deps.approveAndCreateJob).not.toHaveBeenCalled();
  });

  it("rechaza al consultor", async () => {
    const deps = makeDeps();
    const result = await aprobarRequisition(input, { ...ctx, role: "consultant" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/permisos/i);
    expect(deps.approveAndCreateJob).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión activa", async () => {
    const deps = makeDeps();
    const result = await aprobarRequisition(input, { ...ctx, userId: null }, deps);
    expect(result.ok).toBe(false);
    expect(deps.approveAndCreateJob).not.toHaveBeenCalled();
  });

  it("rechaza un comentario demasiado largo", async () => {
    const deps = makeDeps();
    const result = await aprobarRequisition({ ...input, reviewNote: "x".repeat(2001) }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/2\.000/);
    expect(deps.approveAndCreateJob).not.toHaveBeenCalled();
  });
});

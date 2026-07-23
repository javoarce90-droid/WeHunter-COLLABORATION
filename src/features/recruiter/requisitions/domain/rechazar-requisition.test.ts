import { describe, it, expect, vi } from "vitest";
import { rechazarRequisition } from "./rechazar-requisition";
import type { RechazarRequisitionCtx, RechazarRequisitionDeps } from "./rechazar-requisition";

const makeDeps = (overrides?: Partial<RechazarRequisitionDeps>): RechazarRequisitionDeps => ({
  getRequisitionStatus: vi.fn().mockResolvedValue({ id: "req-1", status: "pending" }),
  rejectRequisition: vi.fn().mockResolvedValue({ updated: true }),
  ...overrides,
});

const ctx: RechazarRequisitionCtx = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

const input = { requisitionId: "req-1", reviewNote: "El presupuesto no da para ese perfil." };

describe("rechazarRequisition", () => {
  it("rechaza una solicitud pendiente con motivo", async () => {
    const deps = makeDeps();
    const result = await rechazarRequisition(input, ctx, deps);
    expect(result.ok).toBe(true);
    expect(deps.rejectRequisition).toHaveBeenCalledWith({
      requisitionId: "req-1",
      organizationId: "org-1",
      reviewedBy: "user-1",
      reviewNote: "El presupuesto no da para ese perfil.",
    });
  });

  it("exige un motivo: es la única respuesta que ve el cliente", async () => {
    const deps = makeDeps();
    const result = await rechazarRequisition({ ...input, reviewNote: "   " }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/por qué/i);
    expect(deps.rejectRequisition).not.toHaveBeenCalled();
  });

  it("no rechaza una solicitud ya revisada", async () => {
    const deps = makeDeps({
      getRequisitionStatus: vi.fn().mockResolvedValue({ id: "req-1", status: "rejected" }),
    });
    const result = await rechazarRequisition(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/ya fue revisada/i);
    expect(deps.rejectRequisition).not.toHaveBeenCalled();
  });

  it("no rechaza una solicitud de otra organización", async () => {
    const deps = makeDeps({ getRequisitionStatus: vi.fn().mockResolvedValue(null) });
    const result = await rechazarRequisition(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrada/i);
    expect(deps.rejectRequisition).not.toHaveBeenCalled();
  });

  it("rechaza al consultor", async () => {
    const deps = makeDeps();
    const result = await rechazarRequisition(input, { ...ctx, role: "consultant" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/permisos/i);
    expect(deps.rejectRequisition).not.toHaveBeenCalled();
  });
});

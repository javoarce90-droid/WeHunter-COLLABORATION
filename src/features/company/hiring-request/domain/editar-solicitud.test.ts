import { describe, it, expect, vi } from "vitest";
import { editarSolicitud } from "./editar-solicitud";
import type { EditarSolicitudDeps } from "./editar-solicitud";

const makeDeps = (overrides?: Partial<EditarSolicitudDeps>): EditarSolicitudDeps => ({
  updateRequisition: vi.fn().mockResolvedValue(true),
  ...overrides,
});

const input = {
  token: "tok_abc",
  requisitionId: "req-1",
  reason: "new_position",
  title: "Data Analyst Senior",
};

describe("editarSolicitud", () => {
  it("guarda los cambios con los datos mínimos", async () => {
    const deps = makeDeps();
    const result = await editarSolicitud(input, deps);
    expect(result.ok).toBe(true);
    expect(deps.updateRequisition).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "tok_abc",
        requisitionId: "req-1",
        draft: expect.objectContaining({ reason: "new_position", title: "Data Analyst Senior" }),
      }),
    );
  });

  it("normaliza campos opcionales vacíos a null", async () => {
    const deps = makeDeps();
    await editarSolicitud({ ...input, location: "   ", objectives: "" }, deps);
    const draft = vi.mocked(deps.updateRequisition).mock.calls[0]![0].draft;
    expect(draft.location).toBeNull();
    expect(draft.objectives).toBeNull();
  });

  it("descarta skills en blanco y deja null si no queda ninguna", async () => {
    const deps = makeDeps();
    await editarSolicitud({ ...input, skills: ["  sql ", "", "   "] }, deps);
    expect(vi.mocked(deps.updateRequisition).mock.calls[0]![0].draft.skills).toEqual(["sql"]);
  });

  it("rechaza un motivo inválido", async () => {
    const deps = makeDeps();
    const result = await editarSolicitud({ ...input, reason: "porque_si" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/motivo/i);
    expect(deps.updateRequisition).not.toHaveBeenCalled();
  });

  it("rechaza un título demasiado corto", async () => {
    const deps = makeDeps();
    const result = await editarSolicitud({ ...input, title: "QA" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(deps.updateRequisition).not.toHaveBeenCalled();
  });

  it("rechaza si falta el token", async () => {
    const deps = makeDeps();
    const result = await editarSolicitud({ ...input, token: "" }, deps);
    expect(result.ok).toBe(false);
    expect(deps.updateRequisition).not.toHaveBeenCalled();
  });

  it("propaga el rechazo cuando la solicitud ya no es editable (revisada, ajena o token vencido)", async () => {
    const deps = makeDeps({ updateRequisition: vi.fn().mockResolvedValue(false) });
    const result = await editarSolicitud(input, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/revisad/i);
  });
});

import { describe, it, expect, vi } from "vitest";
import { solicitarBusqueda } from "./solicitar-busqueda";
import type { SolicitarBusquedaDeps } from "./solicitar-busqueda";

const makeDeps = (overrides?: Partial<SolicitarBusquedaDeps>): SolicitarBusquedaDeps => ({
  createRequisition: vi.fn().mockResolvedValue({ requisitionId: "req-1" }),
  ...overrides,
});

const input = {
  token: "tok_abc",
  reason: "new_position",
  title: "Data Analyst Senior",
};

describe("solicitarBusqueda", () => {
  it("crea la solicitud con los datos mínimos", async () => {
    const deps = makeDeps();
    const result = await solicitarBusqueda(input, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.requisitionId).toBe("req-1");
    expect(deps.createRequisition).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "tok_abc",
        draft: expect.objectContaining({ reason: "new_position", title: "Data Analyst Senior" }),
      }),
    );
  });

  it("normaliza campos opcionales vacíos a null", async () => {
    const deps = makeDeps();
    await solicitarBusqueda({ ...input, location: "   ", objectives: "" }, deps);
    const draft = vi.mocked(deps.createRequisition).mock.calls[0]![0].draft;
    expect(draft.location).toBeNull();
    expect(draft.objectives).toBeNull();
  });

  it("descarta skills en blanco y deja null si no queda ninguna", async () => {
    const deps = makeDeps();
    await solicitarBusqueda({ ...input, skills: ["  sql ", "", "   "] }, deps);
    expect(vi.mocked(deps.createRequisition).mock.calls[0]![0].draft.skills).toEqual(["sql"]);

    await solicitarBusqueda({ ...input, skills: ["  ", ""] }, deps);
    expect(vi.mocked(deps.createRequisition).mock.calls[1]![0].draft.skills).toBeNull();
  });

  it("rechaza un motivo inválido", async () => {
    const deps = makeDeps();
    const result = await solicitarBusqueda({ ...input, reason: "porque_si" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/motivo/i);
    expect(deps.createRequisition).not.toHaveBeenCalled();
  });

  it("rechaza un título demasiado corto", async () => {
    const deps = makeDeps();
    const result = await solicitarBusqueda({ ...input, title: "QA" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/corto/i);
    expect(deps.createRequisition).not.toHaveBeenCalled();
  });

  it("rechaza si falta el token", async () => {
    const deps = makeDeps();
    const result = await solicitarBusqueda({ ...input, token: "" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/inválido/i);
    expect(deps.createRequisition).not.toHaveBeenCalled();
  });

  it("propaga el rechazo de la función definer (token vencido)", async () => {
    const deps = makeDeps({ createRequisition: vi.fn().mockResolvedValue(null) });
    const result = await solicitarBusqueda(input, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/vencido/i);
  });
});

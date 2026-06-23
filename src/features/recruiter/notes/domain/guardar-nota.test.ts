import { describe, it, expect, vi } from "vitest";
import { guardarNota } from "./guardar-nota";
import type { GuardarNotaDeps, GuardarNotaContext } from "./guardar-nota";

const makeDeps = (
  overrides?: Partial<GuardarNotaDeps>,
): GuardarNotaDeps => ({
  getApplicationById: vi.fn().mockResolvedValue({ id: "app-1", notes: null }),
  updateNotes: vi.fn().mockImplementation((_id, notes) =>
    Promise.resolve({ id: "app-1", notes }),
  ),
  ...overrides,
});

const ctx: GuardarNotaContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

const input = { applicationId: "app-1", notes: "Muy buena entrevista técnica." };

describe("guardarNota", () => {
  it("guarda la nota correctamente", async () => {
    const deps = makeDeps();
    const result = await guardarNota(input, ctx, deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.notes).toBe("Muy buena entrevista técnica.");
    expect(deps.updateNotes).toHaveBeenCalledWith("app-1", "Muy buena entrevista técnica.");
  });

  it("convierte texto vacío a null (borra la nota)", async () => {
    const deps = makeDeps();
    const result = await guardarNota({ applicationId: "app-1", notes: "   " }, ctx, deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.notes).toBeNull();
    expect(deps.updateNotes).toHaveBeenCalledWith("app-1", null);
  });

  it("rechaza notas que superan 5.000 caracteres", async () => {
    const deps = makeDeps();
    const result = await guardarNota(
      { applicationId: "app-1", notes: "x".repeat(5001) },
      ctx,
      deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/5\.000/);
  });

  it("rechaza si la application no pertenece a la org", async () => {
    const deps = makeDeps({
      getApplicationById: vi.fn().mockResolvedValue(null),
    });
    const result = await guardarNota(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrada/i);
  });

  it("rechaza si el rol es consultant", async () => {
    const deps = makeDeps();
    const result = await guardarNota(input, { ...ctx, role: "consultant" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/consultores/i);
  });

  it("permite guardar nota siendo owner o admin", async () => {
    for (const role of ["owner", "admin"] as const) {
      const deps = makeDeps();
      const result = await guardarNota(input, { ...ctx, role }, deps);
      expect(result.ok).toBe(true);
    }
  });
});

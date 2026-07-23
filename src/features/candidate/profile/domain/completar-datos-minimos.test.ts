import { describe, it, expect, vi } from "vitest";
import { completarDatosMinimos } from "./completar-datos-minimos";

const ctx = { userId: "user-1" };

describe("completarDatosMinimos", () => {
  it("rechaza si no hay sesión", async () => {
    const deps = { updateMinimum: vi.fn() };
    const res = await completarDatosMinimos(
      { phone: "+54 11", location: "CABA", cvUrl: "x", hasExistingCv: true },
      { userId: null },
      deps,
    );
    expect(res.ok).toBe(false);
    expect(deps.updateMinimum).not.toHaveBeenCalled();
  });

  it("rechaza teléfono o ubicación vacíos", async () => {
    const deps = { updateMinimum: vi.fn() };
    expect((await completarDatosMinimos({ phone: "  ", location: "CABA", hasExistingCv: true }, ctx, deps)).ok).toBe(false);
    expect((await completarDatosMinimos({ phone: "+54", location: " ", hasExistingCv: true }, ctx, deps)).ok).toBe(false);
    expect(deps.updateMinimum).not.toHaveBeenCalled();
  });

  it("rechaza si no hay CV nuevo ni existente", async () => {
    const deps = { updateMinimum: vi.fn() };
    const res = await completarDatosMinimos(
      { phone: "+54 11", location: "CABA", hasExistingCv: false },
      ctx,
      deps,
    );
    expect(res.ok).toBe(false);
    expect(deps.updateMinimum).not.toHaveBeenCalled();
  });

  it("persiste cuando los datos están completos (CV nuevo)", async () => {
    const deps = { updateMinimum: vi.fn().mockResolvedValue(undefined) };
    const res = await completarDatosMinimos(
      { phone: " +54 11 ", location: " CABA ", cvUrl: "cvs/x.pdf", hasExistingCv: false },
      ctx,
      deps,
    );
    expect(res).toEqual({ ok: true, data: { userId: "user-1" } });
    expect(deps.updateMinimum).toHaveBeenCalledWith("user-1", {
      phone: "+54 11",
      location: "CABA",
      cvUrl: "cvs/x.pdf",
    });
  });

  it("persiste con CV ya existente (sin cvUrl nuevo)", async () => {
    const deps = { updateMinimum: vi.fn().mockResolvedValue(undefined) };
    const res = await completarDatosMinimos(
      { phone: "+54 11", location: "CABA", hasExistingCv: true },
      ctx,
      deps,
    );
    expect(res.ok).toBe(true);
    expect(deps.updateMinimum).toHaveBeenCalledWith("user-1", {
      phone: "+54 11",
      location: "CABA",
      cvUrl: undefined,
    });
  });
});

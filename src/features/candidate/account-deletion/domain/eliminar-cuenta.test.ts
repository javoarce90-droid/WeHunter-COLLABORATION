import { describe, it, expect, vi } from "vitest";
import { eliminarCuenta } from "./eliminar-cuenta";
import type { EliminarCuentaDeps } from "./eliminar-cuenta";

const deps = (overrides: Partial<EliminarCuentaDeps> = {}): EliminarCuentaDeps => ({
  getCvPath: vi.fn().mockResolvedValue(null),
  deleteCvFile: vi.fn().mockResolvedValue(undefined),
  deleteResumeData: vi.fn().mockResolvedValue(undefined),
  anonymizeProfile: vi.fn().mockResolvedValue(undefined),
  deleteAuthUser: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("eliminarCuenta", () => {
  it("rechaza si no hay usuario autenticado", async () => {
    const d = deps();
    const res = await eliminarCuenta({ userId: null, accountType: "candidate" }, d);
    expect(res.ok).toBe(false);
    expect(d.anonymizeProfile).not.toHaveBeenCalled();
  });

  it("rechaza cuentas de recruiter", async () => {
    const d = deps();
    const res = await eliminarCuenta({ userId: "u-1", accountType: "recruiter" }, d);
    expect(res.ok).toBe(false);
    expect(d.anonymizeProfile).not.toHaveBeenCalled();
  });

  it("borra CV, currículum, anonimiza el perfil y borra la cuenta de Auth, en orden", async () => {
    const calls: string[] = [];
    const d = deps({
      getCvPath: vi.fn().mockImplementation(async () => {
        calls.push("getCvPath");
        return "profiles/u-1/cv.pdf";
      }),
      deleteCvFile: vi.fn().mockImplementation(async () => {
        calls.push("deleteCvFile");
      }),
      deleteResumeData: vi.fn().mockImplementation(async () => {
        calls.push("deleteResumeData");
      }),
      anonymizeProfile: vi.fn().mockImplementation(async () => {
        calls.push("anonymizeProfile");
      }),
      deleteAuthUser: vi.fn().mockImplementation(async () => {
        calls.push("deleteAuthUser");
      }),
    });

    const res = await eliminarCuenta({ userId: "u-1", accountType: "candidate" }, d);

    expect(res).toEqual({ ok: true, data: { userId: "u-1" } });
    expect(d.deleteCvFile).toHaveBeenCalledWith("profiles/u-1/cv.pdf");
    expect(calls).toEqual([
      "getCvPath",
      "deleteCvFile",
      "deleteResumeData",
      "anonymizeProfile",
      "deleteAuthUser",
    ]);
  });

  it("no intenta borrar un CV si el candidato no tenía uno cargado", async () => {
    const d = deps({ getCvPath: vi.fn().mockResolvedValue(null) });
    await eliminarCuenta({ userId: "u-1", accountType: "candidate" }, d);
    expect(d.deleteCvFile).not.toHaveBeenCalled();
  });

  it("un fallo al borrar el CV no bloquea el resto del borrado legal", async () => {
    const d = deps({
      getCvPath: vi.fn().mockResolvedValue("profiles/u-1/cv.pdf"),
      deleteCvFile: vi.fn().mockRejectedValue(new Error("storage caído")),
    });
    const res = await eliminarCuenta({ userId: "u-1", accountType: "candidate" }, d);
    expect(res.ok).toBe(true);
    expect(d.anonymizeProfile).toHaveBeenCalled();
    expect(d.deleteAuthUser).toHaveBeenCalled();
  });
});

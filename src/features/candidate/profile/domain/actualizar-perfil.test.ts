import { describe, it, expect, vi } from "vitest";
import { actualizarPerfil, type ActualizarPerfilDeps } from "./actualizar-perfil";

const mockDeps = (updated = true, path = "profiles/u1/cv-new.pdf"): ActualizarPerfilDeps => ({
  updateProfileFields: vi.fn(async () => ({ updated })),
  uploadCv: vi.fn(async () => ({ path })),
  deleteCv: vi.fn(async () => {}),
});

const ctx = { userId: "u1" };

describe("actualizarPerfil", () => {
  it("rechaza si el usuario no está autenticado", async () => {
    const deps = mockDeps();
    const res = await actualizarPerfil(
      { fullName: "Alejandro Lopez" },
      { userId: null },
      deps,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("Necesitás estar autenticado para actualizar tu perfil.");
    }
    expect(deps.updateProfileFields).not.toHaveBeenCalled();
  });

  it("rechaza si el nombre completo es demasiado corto", async () => {
    const deps = mockDeps();
    const res = await actualizarPerfil({ fullName: " A  " }, ctx, deps);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("El nombre completo es demasiado corto.");
    }
  });

  it("actualiza el perfil sin cambiar el CV si no se provee uploadCv", async () => {
    const deps = mockDeps();
    delete deps.uploadCv;
    const res = await actualizarPerfil({ fullName: "Alejandro Lopez" }, ctx, deps);

    expect(res).toEqual({ ok: true, data: { userId: "u1" } });
    expect(deps.updateProfileFields).toHaveBeenCalledWith("u1", {
      fullName: "Alejandro Lopez",
    });
  });

  it("sube el nuevo CV y lo guarda en la base si se provee uploadCv", async () => {
    const deps = mockDeps(true, "profiles/u1/cv-new.pdf");
    const res = await actualizarPerfil(
      { fullName: "Alejandro Lopez" },
      ctx,
      deps,
    );

    expect(res).toEqual({ ok: true, data: { userId: "u1" } });
    expect(deps.uploadCv).toHaveBeenCalled();
    expect(deps.updateProfileFields).toHaveBeenCalledWith("u1", {
      fullName: "Alejandro Lopez",
      cvUrl: "profiles/u1/cv-new.pdf",
    });
  });

  it("borra el CV anterior si se reemplazó con uno nuevo de forma exitosa", async () => {
    const deps = mockDeps(true, "profiles/u1/cv-new.pdf");
    await actualizarPerfil(
      { fullName: "Alejandro Lopez", currentCvUrl: "profiles/u1/cv-old.pdf" },
      ctx,
      deps,
    );

    expect(deps.deleteCv).toHaveBeenCalledWith("profiles/u1/cv-old.pdf");
  });

  it("limpia el CV nuevo si la actualización del perfil en base de datos falla", async () => {
    const deps = mockDeps(false, "profiles/u1/cv-new.pdf");
    const res = await actualizarPerfil(
      { fullName: "Alejandro Lopez" },
      ctx,
      deps,
    );

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("El perfil no existe.");
    }
    expect(deps.deleteCv).toHaveBeenCalledWith("profiles/u1/cv-new.pdf");
  });
});

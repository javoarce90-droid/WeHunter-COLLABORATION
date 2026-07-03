import { describe, it, expect, vi } from "vitest";
import { actualizarPerfil } from "./actualizar-perfil";

const ctx = { userId: "mock-candidate-id" };
const deps = { updateProfile: vi.fn().mockResolvedValue(undefined) };

describe("actualizarPerfil", () => {
  it("rechaza si el usuario no está autenticado", async () => {
    const res = await actualizarPerfil(
      { fullName: "Alejandro Lopez" },
      { userId: null },
      deps,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("Necesitás estar autenticado para actualizar tu perfil.");
    }
  });

  it("rechaza si el nombre completo es demasiado corto", async () => {
    const res = await actualizarPerfil({ fullName: " A  " }, ctx, deps);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("El nombre completo es demasiado corto.");
    }
  });

  it("actualiza el perfil exitosamente y persiste los campos normalizados", async () => {
    deps.updateProfile.mockClear();
    const res = await actualizarPerfil(
      { fullName: "Alejandro Lopez", skills: "react, react, node " },
      ctx,
      deps,
    );
    expect(res).toEqual({ ok: true, data: { userId: "mock-candidate-id" } });
    expect(deps.updateProfile).toHaveBeenCalledWith(
      "mock-candidate-id",
      expect.objectContaining({ fullName: "Alejandro Lopez", skills: ["react", "node"] }),
      false,
    );
  });

  it("marca el onboarding como completo cuando ctx.markOnboardingComplete es true", async () => {
    deps.updateProfile.mockClear();
    await actualizarPerfil(
      { fullName: "Alejandro Lopez" },
      { ...ctx, markOnboardingComplete: true },
      deps,
    );
    expect(deps.updateProfile).toHaveBeenCalledWith(
      "mock-candidate-id",
      expect.anything(),
      true,
    );
  });
});

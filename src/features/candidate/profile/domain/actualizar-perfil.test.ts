import { describe, it, expect, vi } from "vitest";
import { actualizarPerfil } from "./actualizar-perfil";

const ctx = { userId: "mock-candidate-id" };
const deps = { updateProfile: vi.fn().mockResolvedValue(undefined) };

describe("actualizarPerfil", () => {
  it("rechaza si el usuario no está autenticado", async () => {
    const res = await actualizarPerfil({}, { userId: null }, deps);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("Necesitás estar autenticado para actualizar tu perfil.");
    }
  });

  it("actualiza el perfil exitosamente y persiste los campos normalizados", async () => {
    deps.updateProfile.mockClear();
    const res = await actualizarPerfil(
      { headline: "Frontend Developer", skills: "react, react, node " },
      ctx,
      deps,
    );
    expect(res).toEqual({ ok: true, data: { userId: "mock-candidate-id" } });
    expect(deps.updateProfile).toHaveBeenCalledWith(
      "mock-candidate-id",
      expect.objectContaining({ headline: "Frontend Developer", skills: ["react", "node"] }),
      false,
    );
  });

  it("nunca persiste fullName: no es un campo editable una vez registrado", async () => {
    deps.updateProfile.mockClear();
    // @ts-expect-error fullName no es parte de ActualizarPerfilInput a propósito.
    await actualizarPerfil({ fullName: "Otro Nombre" }, ctx, deps);
    const [, fields] = deps.updateProfile.mock.calls[0]!;
    expect(fields).not.toHaveProperty("fullName");
  });

  it("marca el onboarding como completo cuando ctx.markOnboardingComplete es true", async () => {
    deps.updateProfile.mockClear();
    await actualizarPerfil({}, { ...ctx, markOnboardingComplete: true }, deps);
    expect(deps.updateProfile).toHaveBeenCalledWith(
      "mock-candidate-id",
      expect.anything(),
      true,
    );
  });
});

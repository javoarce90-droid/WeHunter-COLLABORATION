import { describe, it, expect } from "vitest";
import { actualizarPerfil } from "./actualizar-perfil";

const ctx = { userId: "mock-candidate-id" };

describe("actualizarPerfil", () => {
  it("rechaza si el usuario no está autenticado", async () => {
    const res = await actualizarPerfil(
      { fullName: "Alejandro Lopez" },
      { userId: null },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("Necesitás estar autenticado para actualizar tu perfil.");
    }
  });

  it("rechaza si el nombre completo es demasiado corto", async () => {
    const res = await actualizarPerfil({ fullName: " A  " }, ctx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("El nombre completo es demasiado corto.");
    }
  });

  it("actualiza el perfil exitosamente (mock UI-only)", async () => {
    const res = await actualizarPerfil({ fullName: "Alejandro Lopez" }, ctx);
    expect(res).toEqual({ ok: true, data: { userId: "mock-candidate-id" } });
  });
});

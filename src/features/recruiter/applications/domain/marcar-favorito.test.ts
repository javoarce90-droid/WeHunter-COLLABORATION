import { describe, it, expect, vi } from "vitest";
import { marcarFavorito } from "./marcar-favorito";
import type { MarcarFavoritoDeps } from "./marcar-favorito";

const ctx = { organizationId: "org-1" };

const makeDeps = (over?: Partial<MarcarFavoritoDeps>): MarcarFavoritoDeps => ({
  getApplicationById: vi.fn().mockResolvedValue({ id: "app-1" }),
  setFavorite: vi.fn().mockResolvedValue(undefined),
  ...over,
});

describe("marcarFavorito", () => {
  it("marca como favorito cuando la postulación existe", async () => {
    const deps = makeDeps();
    const res = await marcarFavorito({ applicationId: "app-1", isFavorite: true }, ctx, deps);

    expect(res.ok).toBe(true);
    expect(deps.setFavorite).toHaveBeenCalledWith("app-1", true);
  });

  it("desmarca favorito", async () => {
    const deps = makeDeps();
    const res = await marcarFavorito({ applicationId: "app-1", isFavorite: false }, ctx, deps);

    expect(res.ok).toBe(true);
    expect(deps.setFavorite).toHaveBeenCalledWith("app-1", false);
  });

  it("rechaza si la postulación no existe en la org", async () => {
    const deps = makeDeps({ getApplicationById: vi.fn().mockResolvedValue(null) });
    const res = await marcarFavorito({ applicationId: "x", isFavorite: true }, ctx, deps);

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/no encontrada/i);
    expect(deps.setFavorite).not.toHaveBeenCalled();
  });
});

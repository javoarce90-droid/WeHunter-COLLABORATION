import { describe, it, expect } from "vitest";
import { alternarFavorito } from "./gestionar-favoritos";

describe("alternarFavorito", () => {
  it("debería agregar un ID de empleo si no está en la lista", () => {
    const favorites = ["job-1"];
    const result = alternarFavorito(favorites, "job-2");
    expect(result).toEqual(["job-1", "job-2"]);
  });

  it("debería quitar un ID de empleo si ya está en la lista", () => {
    const favorites = ["job-1", "job-2"];
    const result = alternarFavorito(favorites, "job-2");
    expect(result).toEqual(["job-1"]);
  });

  it("debería inicializar con un nuevo empleo si la lista está vacía", () => {
    const result = alternarFavorito([], "job-1");
    expect(result).toEqual(["job-1"]);
  });
});

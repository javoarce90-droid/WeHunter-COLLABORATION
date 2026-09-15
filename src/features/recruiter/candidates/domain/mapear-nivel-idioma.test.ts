import { describe, expect, it } from "vitest";
import { mapearNivelIdioma } from "./mapear-nivel-idioma";

describe("mapearNivelIdioma", () => {
  it("mapea 'Native or bilingual proficiency' a nativo", () => {
    expect(mapearNivelIdioma("Native or bilingual proficiency")).toBe("nativo");
  });

  it("mapea 'Bilingual' a nativo", () => {
    expect(mapearNivelIdioma("Bilingual")).toBe("nativo");
  });

  it("mapea 'Full professional proficiency' a avanzado", () => {
    expect(mapearNivelIdioma("Full professional proficiency")).toBe("avanzado");
  });

  it("mapea 'Professional working proficiency' a avanzado", () => {
    expect(mapearNivelIdioma("Professional working proficiency")).toBe("avanzado");
  });

  it("mapea 'Limited working proficiency' a intermedio", () => {
    expect(mapearNivelIdioma("Limited working proficiency")).toBe("intermedio");
  });

  it("mapea 'Elementary proficiency' a basico", () => {
    expect(mapearNivelIdioma("Elementary proficiency")).toBe("basico");
  });

  it("es insensible a mayúsculas/minúsculas", () => {
    expect(mapearNivelIdioma("NATIVE OR BILINGUAL PROFICIENCY")).toBe("nativo");
  });

  it("devuelve intermedio por defecto para un valor no reconocido", () => {
    expect(mapearNivelIdioma("Algo que HarvestAPI nunca dijo")).toBe("intermedio");
  });

  it("devuelve intermedio por defecto para null", () => {
    expect(mapearNivelIdioma(null)).toBe("intermedio");
  });

  it("devuelve intermedio por defecto para undefined", () => {
    expect(mapearNivelIdioma(undefined)).toBe("intermedio");
  });

  it("devuelve intermedio por defecto para string vacío", () => {
    expect(mapearNivelIdioma("")).toBe("intermedio");
  });
});

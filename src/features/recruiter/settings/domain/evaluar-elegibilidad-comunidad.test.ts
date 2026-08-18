import { describe, it, expect } from "vitest";
import { evaluarElegibilidadComunidad } from "./evaluar-elegibilidad-comunidad";

describe("evaluarElegibilidadComunidad", () => {
  it("elegible cuando los 3 campos están completos", () => {
    const result = evaluarElegibilidadComunidad({
      fullName: "Ana Pérez",
      jobTitle: "Talent Acquisition Lead",
      bio: "Reclutadora tech hace 8 años.",
    });
    expect(result.elegible).toBe(true);
    expect(result.faltantes).toEqual([]);
    expect(result.requisitos.every((r) => r.cumplido)).toBe(true);
  });

  it("no elegible y lista lo que falta cuando hay campos vacíos", () => {
    const result = evaluarElegibilidadComunidad({
      fullName: "Ana Pérez",
      jobTitle: null,
      bio: "",
    });
    expect(result.elegible).toBe(false);
    expect(result.faltantes).toEqual(["Título profesional", "Bio"]);
  });

  it("trata espacios en blanco como campo vacío", () => {
    const result = evaluarElegibilidadComunidad({
      fullName: "   ",
      jobTitle: "Recruiter",
      bio: "Bio real.",
    });
    expect(result.elegible).toBe(false);
    expect(result.faltantes).toEqual(["Nombre completo"]);
  });

  it("no elegible cuando todos los campos están vacíos", () => {
    const result = evaluarElegibilidadComunidad({ fullName: null, jobTitle: null, bio: null });
    expect(result.elegible).toBe(false);
    expect(result.faltantes).toEqual(["Nombre completo", "Título profesional", "Bio"]);
  });
});

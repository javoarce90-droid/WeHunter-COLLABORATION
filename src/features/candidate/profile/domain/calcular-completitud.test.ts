import { describe, it, expect } from "vitest";
import { calcularCompletitud } from "./calcular-completitud";

const emptyProfile = {
  headline: null,
  bio: null,
  location: null,
  phone: null,
  cvUrl: null,
  skills: null,
};
const emptyResume = { experiences: [], education: [], certifications: [], languages: [] };

describe("calcularCompletitud", () => {
  it("perfil totalmente vacío → 0% y todas las secciones faltantes", () => {
    const res = calcularCompletitud(emptyProfile, emptyResume);
    expect(res.percent).toBe(0);
    expect(res.faltantes).toContain("experiencia");
    expect(res.faltantes).toContain("tu perfil profesional");
  });

  it("perfil completo en todas las secciones → 100%", () => {
    const res = calcularCompletitud(
      {
        headline: "Dev",
        bio: "Resumen",
        location: "CABA",
        phone: "+54 11",
        cvUrl: "cvs/x.pdf",
        skills: ["ts"],
      },
      {
        experiences: [{}],
        education: [{}],
        certifications: [{}],
        languages: [{}],
      },
    );
    expect(res.percent).toBe(100);
    expect(res.faltantes).toEqual([]);
  });

  it("ordena las faltantes por peso descendente (experiencia antes que certificaciones)", () => {
    const res = calcularCompletitud(
      { ...emptyProfile, headline: "x", bio: "x", location: "x", phone: "x", cvUrl: "x" },
      emptyResume,
    );
    expect(res.faltantes[0]).toBe("experiencia");
    expect(res.faltantes.indexOf("experiencia")).toBeLessThan(res.faltantes.indexOf("certificaciones"));
    expect(res.faltantes).not.toContain("tu perfil profesional");
  });

  it("los pesos suman 100 (perfil 26 + sumatoria de secciones)", () => {
    const soloPerfil = calcularCompletitud(
      { headline: "x", bio: "x", location: "x", phone: "x", cvUrl: "x", skills: null },
      emptyResume,
    );
    expect(soloPerfil.percent).toBe(26);
  });
});

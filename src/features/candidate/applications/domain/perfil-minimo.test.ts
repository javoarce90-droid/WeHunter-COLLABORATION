import { describe, it, expect } from "vitest";
import { perfilListoParaPostular } from "./perfil-minimo";

const completo = {
  fullName: "Ana López",
  email: "ana@ejemplo.com",
  phone: "+54 11 1234",
  location: "CABA",
  cvUrl: "cvs/ana.pdf",
};

describe("perfilListoParaPostular", () => {
  it("acepta un perfil con los 5 campos", () => {
    expect(perfilListoParaPostular(completo)).toEqual({ ok: true, faltantes: [] });
  });

  it("lista cada campo faltante con su label", () => {
    const res = perfilListoParaPostular({
      fullName: null,
      email: "ana@ejemplo.com",
      phone: "  ",
      location: null,
      cvUrl: "cvs/ana.pdf",
    });
    expect(res.ok).toBe(false);
    expect(res.faltantes).toEqual(["nombre", "teléfono", "ubicación"]);
  });

  it("trata cvUrl vacío como faltante", () => {
    const res = perfilListoParaPostular({ ...completo, cvUrl: "" });
    expect(res.ok).toBe(false);
    expect(res.faltantes).toEqual(["CV"]);
  });
});

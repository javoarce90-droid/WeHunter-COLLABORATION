import { describe, it, expect } from "vitest";
import { personalizarMensaje } from "./personalizar-mensaje";

describe("personalizarMensaje", () => {
  it("reemplaza ambas variables cuando vienen las dos", () => {
    const result = personalizarMensaje("Hola {{candidato}}, sobre {{puesto}}.", {
      candidato: "Ana",
      puesto: "Frontend Senior",
    });
    expect(result).toBe("Hola Ana, sobre Frontend Senior.");
  });

  it("deja {{candidato}} intacto si no viene (mensaje en lote)", () => {
    const result = personalizarMensaje("Hola {{candidato}}, sobre {{puesto}}.", {
      puesto: "Frontend Senior",
    });
    expect(result).toBe("Hola {{candidato}}, sobre Frontend Senior.");
  });

  it("deja {{puesto}} intacto si no viene", () => {
    const result = personalizarMensaje("Hola {{candidato}}, sobre {{puesto}}.", {
      candidato: "Ana",
    });
    expect(result).toBe("Hola Ana, sobre {{puesto}}.");
  });

  it("reemplaza todas las ocurrencias repetidas de una variable", () => {
    const result = personalizarMensaje("{{puesto}} — buscamos {{puesto}}.", {
      puesto: "QA",
    });
    expect(result).toBe("QA — buscamos QA.");
  });

  it("no toca el resto del texto si no hay valores", () => {
    const result = personalizarMensaje("Sin variables acá.", {});
    expect(result).toBe("Sin variables acá.");
  });
});

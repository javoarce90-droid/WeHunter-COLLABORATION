import { describe, it, expect } from "vitest";
import { parseResumeDateToDb } from "./parse-resume-date";

describe("parseResumeDateToDb", () => {
  it("null pasa como null (actualidad / sin dato)", () => {
    expect(parseResumeDateToDb(null)).toBeNull();
  });

  it("string vacío pasa como null", () => {
    expect(parseResumeDateToDb("")).toBeNull();
    expect(parseResumeDateToDb("   ")).toBeNull();
  });

  it("una fecha ya válida (YYYY-MM-DD) pasa tal cual", () => {
    expect(parseResumeDateToDb("2022-01-15")).toBe("2022-01-15");
  });

  it("año-mes (YYYY-MM, el fallback determinístico) pasa tal cual", () => {
    expect(parseResumeDateToDb("2022-01")).toBe("2022-01");
  });

  it("mes abreviado en inglés + año (HarvestAPI real) se convierte al día 1 de ese mes", () => {
    expect(parseResumeDateToDb("Mar 2025")).toBe("2025-03-01");
  });

  it("mes abreviado en español + año se convierte al día 1 de ese mes", () => {
    expect(parseResumeDateToDb("Abr 2025")).toBe("2025-04-01");
  });

  it("solo año (HarvestAPI real, education) se convierte al 1 de enero de ese año", () => {
    expect(parseResumeDateToDb("2004")).toBe("2004-01-01");
  });

  it("sin año reconocible devuelve null en vez de inventar uno", () => {
    expect(parseResumeDateToDb("Presente")).toBeNull();
    expect(parseResumeDateToDb("actualidad")).toBeNull();
  });
});

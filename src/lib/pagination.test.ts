import { describe, it, expect } from "vitest";
import { parsePage, paginationRange, totalPages } from "./pagination";

describe("parsePage", () => {
  it("default a 1 si falta, no es entero, o es <= 0", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
  });

  it("parsea un número válido", () => {
    expect(parsePage("3")).toBe(3);
  });

  it("se queda con el primer valor si el param viene repetido", () => {
    expect(parsePage(["2", "5"])).toBe(2);
  });
});

describe("paginationRange", () => {
  it("calcula offset según página y tamaño", () => {
    expect(paginationRange(1)).toEqual({ limit: 10, offset: 0 });
    expect(paginationRange(2)).toEqual({ limit: 10, offset: 10 });
    expect(paginationRange(3, 20)).toEqual({ limit: 20, offset: 40 });
  });
});

describe("totalPages", () => {
  it("redondea hacia arriba", () => {
    expect(totalPages(25)).toBe(3);
    expect(totalPages(20)).toBe(2);
  });

  it("nunca da menos de 1, ni con 0 resultados", () => {
    expect(totalPages(0)).toBe(1);
  });
});

import { describe, it, expect } from "vitest";
import { normalizeUrl } from "./url";

describe("normalizeUrl", () => {
  it("le pone https:// a un dominio pelado", () => {
    expect(normalizeUrl("sitio.com")).toBe("https://sitio.com");
  });

  it("le pone https:// a un dominio con www", () => {
    expect(normalizeUrl("www.sitio.com")).toBe("https://www.sitio.com");
  });

  it("respeta una URL que ya trae https://", () => {
    expect(normalizeUrl("https://sitio.com")).toBe("https://sitio.com");
  });

  it("respeta http:// si el usuario lo puso explícito", () => {
    expect(normalizeUrl("http://sitio.com")).toBe("http://sitio.com");
  });

  it("conserva path, query y puerto", () => {
    expect(normalizeUrl("linkedin.com/in/juana-perez")).toBe(
      "https://linkedin.com/in/juana-perez",
    );
    expect(normalizeUrl("example.com:8080/x?y=1")).toBe("https://example.com:8080/x?y=1");
  });

  it("recorta espacios", () => {
    expect(normalizeUrl("  sitio.com  ")).toBe("https://sitio.com");
  });

  it("vacío o solo espacios queda vacío", () => {
    expect(normalizeUrl("")).toBe("");
    expect(normalizeUrl("   ")).toBe("");
  });

  it("completa una URL protocol-relative", () => {
    expect(normalizeUrl("//cdn.sitio.com/logo.png")).toBe("https://cdn.sitio.com/logo.png");
  });
});

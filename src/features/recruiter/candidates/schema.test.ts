import { describe, it, expect } from "vitest";
import { candidateInputSchema, CV_ALLOWED_TYPES, CV_EXT_BY_TYPE } from "./schema";

describe("candidateInputSchema.email", () => {
  it("acepta el campo ausente (no se rompe con null/undefined)", () => {
    // FormData.get devuelve null si el campo falta: no debe tirar "Expected string".
    const r1 = candidateInputSchema.safeParse({ fullName: "Ada", email: null });
    const r2 = candidateInputSchema.safeParse({ fullName: "Ada" });
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r1.success && r1.data.email).toBeUndefined();
  });

  it("trata el string vacío como sin email", () => {
    const r = candidateInputSchema.safeParse({ fullName: "Ada", email: "   " });
    expect(r.success).toBe(true);
    expect(r.success && r.data.email).toBeUndefined();
  });

  it("normaliza y valida un email real", () => {
    const r = candidateInputSchema.safeParse({ fullName: "Ada", email: " ADA@X.COM " });
    expect(r.success && r.data.email).toBe("ada@x.com");
  });

  it("rechaza un email malformado", () => {
    const r = candidateInputSchema.safeParse({ fullName: "Ada", email: "no-es-email" });
    expect(r.success).toBe(false);
  });
});

describe("CV tipos/extensiones", () => {
  it("la extensión sale del MIME validado y los tipos permitidos derivan del mapa", () => {
    expect(CV_EXT_BY_TYPE["application/pdf"]).toBe(".pdf");
    expect(CV_ALLOWED_TYPES).toEqual(Object.keys(CV_EXT_BY_TYPE));
    expect(CV_ALLOWED_TYPES).toContain("application/pdf");
  });
});

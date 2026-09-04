import { describe, it, expect } from "vitest";
import {
  candidateInputSchema,
  candidateCreateInputSchema,
  CV_ALLOWED_TYPES,
  CV_EXT_BY_TYPE,
} from "./schema";

/** Alta/edición válida mínima: nombre + email + teléfono (los tres obligatorios). */
const base = { fullName: "Ada", email: "ada@x.com", phone: "+543515551234" };

describe("candidateInputSchema.email (obligatorio)", () => {
  it("rechaza el campo ausente o null (FormData.get devuelve null si falta)", () => {
    expect(candidateInputSchema.safeParse({ ...base, email: null }).success).toBe(false);
    expect(
      candidateInputSchema.safeParse({ fullName: base.fullName, phone: base.phone }).success,
    ).toBe(false);
  });

  it("rechaza el string vacío o solo espacios", () => {
    expect(candidateInputSchema.safeParse({ ...base, email: "   " }).success).toBe(false);
  });

  it("normaliza y valida un email real", () => {
    const r = candidateInputSchema.safeParse({ ...base, email: " ADA@X.COM " });
    expect(r.success && r.data.email).toBe("ada@x.com");
  });

  it("rechaza un email malformado", () => {
    expect(
      candidateInputSchema.safeParse({ ...base, email: "no-es-email" }).success,
    ).toBe(false);
  });
});

describe("candidateInputSchema.phone (obligatorio)", () => {
  it("rechaza el campo ausente y el string vacío", () => {
    expect(
      candidateInputSchema.safeParse({ fullName: base.fullName, email: base.email }).success,
    ).toBe(false);
    expect(candidateInputSchema.safeParse({ ...base, phone: "   " }).success).toBe(false);
  });

  it("recorta espacios de un teléfono real", () => {
    const r = candidateInputSchema.safeParse({
      ...base,
      phone: "  +54 9 351 555-1234  ",
    });
    expect(r.success && r.data.phone).toBe("+54 9 351 555-1234");
  });
});

describe("candidateCreateInputSchema (mismo contrato que editar)", () => {
  it("comparte el schema de edición", () => {
    expect(candidateCreateInputSchema).toBe(candidateInputSchema);
  });

  it("acepta y normaliza un alta completa", () => {
    const r = candidateCreateInputSchema.safeParse({ ...base, email: " ADA@X.COM " });
    expect(r.success && r.data.email).toBe("ada@x.com");
  });
});

describe("candidateInputSchema.seniority", () => {
  it("acepta el campo ausente o vacío como sin especificar", () => {
    const r1 = candidateInputSchema.safeParse(base);
    const r2 = candidateInputSchema.safeParse({ ...base, seniority: "" });
    expect(r1.success && r1.data.seniority).toBeUndefined();
    expect(r2.success && r2.data.seniority).toBeUndefined();
  });

  it("acepta un valor válido del enum", () => {
    const r = candidateInputSchema.safeParse({ ...base, seniority: "senior" });
    expect(r.success && r.data.seniority).toBe("senior");
  });

  it("rechaza un valor fuera del enum", () => {
    expect(
      candidateInputSchema.safeParse({ ...base, seniority: "master" }).success,
    ).toBe(false);
  });
});

describe("candidateInputSchema.skills", () => {
  it("acepta el campo ausente y separa por coma", () => {
    const r1 = candidateInputSchema.safeParse(base);
    expect(r1.success && r1.data.skills).toBeUndefined();
    const r2 = candidateInputSchema.safeParse({ ...base, skills: "React, Node " });
    expect(r2.success && r2.data.skills).toEqual(["React", "Node"]);
  });

  it("rechaza una skill de más de 40 caracteres con mensaje en español (no el default de Zod)", () => {
    const r = candidateInputSchema.safeParse({
      ...base,
      skills: "a".repeat(41),
    });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues[0].message).toBe("Cada skill puede tener hasta 40 caracteres.");
  });
});

describe("CV tipos/extensiones", () => {
  it("la extensión sale del MIME validado y los tipos permitidos derivan del mapa", () => {
    expect(CV_EXT_BY_TYPE["application/pdf"]).toBe(".pdf");
    expect(CV_ALLOWED_TYPES).toEqual(Object.keys(CV_EXT_BY_TYPE));
    expect(CV_ALLOWED_TYPES).toContain("application/pdf");
  });
});

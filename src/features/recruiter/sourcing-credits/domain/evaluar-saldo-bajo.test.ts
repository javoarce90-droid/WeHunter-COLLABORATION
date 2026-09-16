import { describe, it, expect } from "vitest";
import { debeAvisarSaldoBajo } from "./evaluar-saldo-bajo";

describe("debeAvisarSaldoBajo", () => {
  it("avisa en Freelancer (budget 250 → umbral 25) cuando el saldo baja a 25", () => {
    expect(debeAvisarSaldoBajo(25, 250)).toBe(true);
  });

  it("no avisa en Freelancer con saldo por encima del umbral", () => {
    expect(debeAvisarSaldoBajo(26, 250)).toBe(false);
  });

  it("avisa en Teams (budget 1.350 → umbral 135) cuando el saldo baja a 135", () => {
    expect(debeAvisarSaldoBajo(135, 1350)).toBe(true);
  });

  it("no avisa en Teams con saldo por encima del umbral", () => {
    expect(debeAvisarSaldoBajo(136, 1350)).toBe(false);
  });

  it("respeta un umbral configurable distinto al default", () => {
    expect(debeAvisarSaldoBajo(50, 200, 0.25)).toBe(true);
    expect(debeAvisarSaldoBajo(51, 200, 0.25)).toBe(false);
  });

  it("nunca avisa si no hay budget configurado (0)", () => {
    expect(debeAvisarSaldoBajo(0, 0)).toBe(false);
  });

  it("avisa en saldo cero (caso límite del bloqueo)", () => {
    expect(debeAvisarSaldoBajo(0, 250)).toBe(true);
  });
});

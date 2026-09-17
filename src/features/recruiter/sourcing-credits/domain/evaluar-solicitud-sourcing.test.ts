import { describe, it, expect } from "vitest";
import { evaluarSolicitudSourcing } from "./evaluar-solicitud-sourcing";

describe("evaluarSolicitudSourcing", () => {
  it("permite el pedido completo cuando el saldo alcanza", () => {
    expect(evaluarSolicitudSourcing(10, 50)).toEqual({ ok: true, maxResults: 10 });
  });

  it("acota el pedido al saldo disponible — pide 10, tiene 7 (spec.md)", () => {
    expect(evaluarSolicitudSourcing(10, 7)).toEqual({ ok: true, maxResults: 7 });
  });

  it("permite el pedido completo cuando el saldo es exactamente igual", () => {
    expect(evaluarSolicitudSourcing(10, 10)).toEqual({ ok: true, maxResults: 10 });
  });

  it("bloquea con saldo cero", () => {
    expect(evaluarSolicitudSourcing(10, 0)).toEqual({ ok: false, available: 0 });
  });

  it("bloquea con saldo negativo (edge case de concurrencia ya ocurrido)", () => {
    expect(evaluarSolicitudSourcing(10, -3)).toEqual({ ok: false, available: 0 });
  });
});

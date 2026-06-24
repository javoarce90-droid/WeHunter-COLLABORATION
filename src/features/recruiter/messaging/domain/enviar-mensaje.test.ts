import { describe, it, expect, vi } from "vitest";
import { enviarMensaje } from "./enviar-mensaje";
import type { EnviarMensajeContext, EnviarMensajeDeps } from "./enviar-mensaje";

const ctx: EnviarMensajeContext = { organizationId: "org-1", role: "recruiter" };

const makeDeps = (over?: Partial<EnviarMensajeDeps>): EnviarMensajeDeps => ({
  getCandidate: vi.fn().mockResolvedValue({ id: "c-1" }),
  ensureThread: vi.fn().mockResolvedValue({ threadId: "t-1" }),
  recordOutbound: vi.fn().mockResolvedValue(undefined),
  ...over,
});

const input = { candidateId: "c-1", channel: "email" as const, body: "Hola!" };

describe("enviarMensaje", () => {
  it("envía y registra el mensaje en el hilo del canal", async () => {
    const deps = makeDeps();
    const res = await enviarMensaje(input, ctx, deps);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.threadId).toBe("t-1");
    expect(deps.ensureThread).toHaveBeenCalledWith("c-1", "email");
    expect(deps.recordOutbound).toHaveBeenCalledWith("t-1", "Hola!");
  });

  it("rechaza mensaje vacío", async () => {
    const deps = makeDeps();
    const res = await enviarMensaje({ ...input, body: "   " }, ctx, deps);
    expect(res.ok).toBe(false);
    expect(deps.recordOutbound).not.toHaveBeenCalled();
  });

  it("rechaza si el candidato no existe", async () => {
    const deps = makeDeps({ getCandidate: vi.fn().mockResolvedValue(null) });
    const res = await enviarMensaje(input, ctx, deps);
    expect(res.ok).toBe(false);
    expect(deps.ensureThread).not.toHaveBeenCalled();
  });

  it("rechaza al consultor", async () => {
    const deps = makeDeps();
    const res = await enviarMensaje(input, { ...ctx, role: "consultant" }, deps);
    expect(res.ok).toBe(false);
    expect(deps.getCandidate).not.toHaveBeenCalled();
  });
});

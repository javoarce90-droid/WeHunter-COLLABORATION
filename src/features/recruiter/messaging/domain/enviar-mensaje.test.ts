import { describe, it, expect, vi } from "vitest";
import { enviarMensaje } from "./enviar-mensaje";
import type { EnviarMensajeContext, EnviarMensajeDeps } from "./enviar-mensaje";

const ctx: EnviarMensajeContext = { organizationId: "org-1", role: "recruiter" };

const makeDeps = (over?: Partial<EnviarMensajeDeps>): EnviarMensajeDeps => ({
  getCandidate: vi.fn().mockResolvedValue({ id: "c-1", email: "candidato@mail.com" }),
  ensureThread: vi.fn().mockResolvedValue({ threadId: "t-1" }),
  send: vi.fn().mockResolvedValue({ ok: true, externalId: "gmail-msg-1" }),
  recordOutbound: vi.fn().mockResolvedValue(undefined),
  ...over,
});

const input = {
  candidateId: "c-1",
  channel: "email" as const,
  subject: "Asunto",
  body: "Hola!",
};

describe("enviarMensaje", () => {
  it("envía y registra el mensaje en el hilo del canal, con el externalId del envío", async () => {
    const deps = makeDeps();
    const res = await enviarMensaje(input, ctx, deps);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.threadId).toBe("t-1");
    expect(deps.send).toHaveBeenCalledWith("email", "candidato@mail.com", "Asunto", "Hola!");
    expect(deps.ensureThread).toHaveBeenCalledWith("c-1", "email");
    expect(deps.recordOutbound).toHaveBeenCalledWith("t-1", "Hola!", "gmail-msg-1");
  });

  it("rechaza mensaje vacío", async () => {
    const deps = makeDeps();
    const res = await enviarMensaje({ ...input, body: "   " }, ctx, deps);
    expect(res.ok).toBe(false);
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.recordOutbound).not.toHaveBeenCalled();
  });

  it("rechaza si el candidato no existe", async () => {
    const deps = makeDeps({ getCandidate: vi.fn().mockResolvedValue(null) });
    const res = await enviarMensaje(input, ctx, deps);
    expect(res.ok).toBe(false);
    expect(deps.ensureThread).not.toHaveBeenCalled();
  });

  it("rechaza al viewer", async () => {
    const deps = makeDeps();
    const res = await enviarMensaje(input, { ...ctx, role: "viewer" }, deps);
    expect(res.ok).toBe(false);
    expect(deps.getCandidate).not.toHaveBeenCalled();
  });

  it("si el envío real falla, no registra nada en el historial", async () => {
    const deps = makeDeps({
      send: vi.fn().mockResolvedValue({ ok: false, error: "Conectá tu Google." }),
    });
    const res = await enviarMensaje(input, ctx, deps);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toBe("Conectá tu Google.");
    expect(deps.ensureThread).not.toHaveBeenCalled();
    expect(deps.recordOutbound).not.toHaveBeenCalled();
  });

  it("whatsapp sigue mock: igual pasa por deps.send (que ahí no hace nada real)", async () => {
    const deps = makeDeps();
    await enviarMensaje({ ...input, channel: "whatsapp" }, ctx, deps);
    expect(deps.send).toHaveBeenCalledWith("whatsapp", "candidato@mail.com", "Asunto", "Hola!");
  });
});

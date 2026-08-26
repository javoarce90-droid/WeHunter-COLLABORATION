import { describe, it, expect, vi } from "vitest";
import { enviarOferta } from "./enviar-oferta";
import type { EnviarOfertaDeps, OfferForSend } from "./enviar-oferta";

const offer: OfferForSend = {
  candidateEmail: "candidato@mail.com",
  title: "Data Analyst Sr",
  body: "Estimado, te ofrecemos...",
};

const makeDeps = (over?: Partial<EnviarOfertaDeps>): EnviarOfertaDeps => ({
  getOfferDetail: vi.fn().mockResolvedValue(offer),
  sendEmail: vi.fn().mockResolvedValue({ ok: true }),
  ...over,
});

describe("enviarOferta", () => {
  it("envía la carta con el asunto armado a partir del título", async () => {
    const deps = makeDeps();
    const res = await enviarOferta("offer-1", "org-1", deps);
    expect(res.ok).toBe(true);
    expect(deps.sendEmail).toHaveBeenCalledWith(
      "candidato@mail.com",
      "Oferta laboral — Data Analyst Sr",
      "Estimado, te ofrecemos...",
    );
  });

  it("rechaza si la oferta no existe", async () => {
    const deps = makeDeps({ getOfferDetail: vi.fn().mockResolvedValue(null) });
    const res = await enviarOferta("offer-x", "org-1", deps);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/no encontrada/i);
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it("rechaza si el candidato no tiene email", async () => {
    const deps = makeDeps({
      getOfferDetail: vi.fn().mockResolvedValue({ ...offer, candidateEmail: null }),
    });
    const res = await enviarOferta("offer-1", "org-1", deps);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/no tiene email/i);
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it("rechaza si la carta está vacía", async () => {
    const deps = makeDeps({
      getOfferDetail: vi.fn().mockResolvedValue({ ...offer, body: "   " }),
    });
    const res = await enviarOferta("offer-1", "org-1", deps);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/vacía/i);
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it("propaga el error si el envío real falla (ej. sin conexión de Google)", async () => {
    const deps = makeDeps({
      sendEmail: vi.fn().mockResolvedValue({ ok: false, error: "Conectá tu Google." }),
    });
    const res = await enviarOferta("offer-1", "org-1", deps);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toBe("Conectá tu Google.");
  });
});

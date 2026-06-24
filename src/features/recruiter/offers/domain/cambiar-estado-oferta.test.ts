import { describe, it, expect, vi } from "vitest";
import { cambiarEstadoOferta } from "./cambiar-estado-oferta";
import type { CambiarEstadoContext, CambiarEstadoDeps } from "./cambiar-estado-oferta";
import type { OfferStatus } from "../schema";

const ctx: CambiarEstadoContext = { organizationId: "org-1", role: "recruiter" };

const makeDeps = (status: OfferStatus, over?: Partial<CambiarEstadoDeps>): CambiarEstadoDeps => ({
  getOffer: vi
    .fn()
    .mockResolvedValue({ id: "offer-1", status, applicationId: "app-1", jobId: "job-1" }),
  updateStatus: vi.fn().mockResolvedValue(undefined),
  acceptOffer: vi.fn().mockResolvedValue(undefined),
  ...over,
});

describe("cambiarEstadoOferta", () => {
  it("envía un borrador (draft → sent)", async () => {
    const deps = makeDeps("draft");
    const res = await cambiarEstadoOferta({ offerId: "offer-1", toStatus: "sent" }, ctx, deps);
    expect(res.ok).toBe(true);
    expect(deps.updateStatus).toHaveBeenCalledWith("offer-1", "sent");
    expect(deps.acceptOffer).not.toHaveBeenCalled();
  });

  it("aceptar dispara acceptOffer (no el update simple)", async () => {
    const deps = makeDeps("sent");
    const res = await cambiarEstadoOferta({ offerId: "offer-1", toStatus: "accepted" }, ctx, deps);
    expect(res.ok).toBe(true);
    expect(deps.acceptOffer).toHaveBeenCalledWith("offer-1");
    expect(deps.updateStatus).not.toHaveBeenCalled();
  });

  it("rechaza una transición inválida (draft → accepted)", async () => {
    const deps = makeDeps("draft");
    const res = await cambiarEstadoOferta({ offerId: "offer-1", toStatus: "accepted" }, ctx, deps);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/no se puede pasar/i);
    expect(deps.acceptOffer).not.toHaveBeenCalled();
  });

  it("rechaza salir de un estado terminal (accepted → rejected)", async () => {
    const deps = makeDeps("accepted");
    const res = await cambiarEstadoOferta({ offerId: "offer-1", toStatus: "rejected" }, ctx, deps);
    expect(res.ok).toBe(false);
  });

  it("rechaza al consultor", async () => {
    const res = await cambiarEstadoOferta(
      { offerId: "offer-1", toStatus: "sent" },
      { ...ctx, role: "consultant" },
      makeDeps("draft"),
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/consultor/i);
  });

  it("rechaza si la oferta no existe", async () => {
    const deps = makeDeps("draft", { getOffer: vi.fn().mockResolvedValue(null) });
    const res = await cambiarEstadoOferta({ offerId: "x", toStatus: "sent" }, ctx, deps);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/no encontrada/i);
  });

  it("rechaza el mismo estado", async () => {
    const deps = makeDeps("sent");
    const res = await cambiarEstadoOferta({ offerId: "offer-1", toStatus: "sent" }, ctx, deps);
    expect(res.ok).toBe(false);
  });
});

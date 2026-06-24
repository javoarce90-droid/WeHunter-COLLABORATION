import { describe, it, expect, vi } from "vitest";
import { editarOferta } from "./editar-oferta";
import type { EditarOfertaContext, EditarOfertaDeps } from "./editar-oferta";
import type { OfferStatus } from "../schema";

const ctx: EditarOfertaContext = { organizationId: "org-1", role: "recruiter" };

const makeDeps = (status: OfferStatus): EditarOfertaDeps => ({
  getOffer: vi.fn().mockResolvedValue({ id: "offer-1", status }),
  updateOffer: vi.fn().mockResolvedValue(undefined),
});

const input = { offerId: "offer-1", title: "Backend Senior", salaryAmount: 2500 };

describe("editarOferta", () => {
  it("edita un borrador", async () => {
    const deps = makeDeps("draft");
    const res = await editarOferta(input, ctx, deps);
    expect(res.ok).toBe(true);
    expect(deps.updateOffer).toHaveBeenCalledWith(
      "offer-1",
      expect.objectContaining({ title: "Backend Senior", salaryAmount: 2500 }),
    );
  });

  it("edita en negociación", async () => {
    const res = await editarOferta(input, ctx, makeDeps("negotiation"));
    expect(res.ok).toBe(true);
  });

  it("no edita una oferta enviada", async () => {
    const deps = makeDeps("sent");
    const res = await editarOferta(input, ctx, deps);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/borrador o en negociación/i);
    expect(deps.updateOffer).not.toHaveBeenCalled();
  });

  it("no edita una oferta aceptada (terminal)", async () => {
    const res = await editarOferta(input, ctx, makeDeps("accepted"));
    expect(res.ok).toBe(false);
  });

  it("rechaza al consultor", async () => {
    const res = await editarOferta(input, { ...ctx, role: "consultant" }, makeDeps("draft"));
    expect(res.ok).toBe(false);
  });
});

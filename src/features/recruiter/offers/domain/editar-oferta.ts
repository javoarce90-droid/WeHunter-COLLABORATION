import { isOfferEditable, type OfferStatus } from "../schema";

export type EditarOfertaInput = {
  offerId: string;
  title: string;
  salaryAmount?: number;
  salaryCurrency?: string;
  benefits?: string;
  startDate?: string;
  validUntil?: string;
  body?: string;
};

export type EditarOfertaContext = {
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
};

export type EditarOfertaDeps = {
  getOffer: (
    offerId: string,
    organizationId: string,
  ) => Promise<{ id: string; status: OfferStatus } | null>;
  updateOffer: (offerId: string, patch: Omit<EditarOfertaInput, "offerId">) => Promise<void>;
};

export async function editarOferta(
  input: EditarOfertaInput,
  ctx: EditarOfertaContext,
  deps: EditarOfertaDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden editar ofertas." };
  }

  if (input.title.trim().length === 0) {
    return { ok: false, error: "El puesto es obligatorio." };
  }

  const offer = await deps.getOffer(input.offerId, ctx.organizationId);
  if (!offer) {
    return { ok: false, error: "Oferta no encontrada." };
  }
  if (!isOfferEditable(offer.status)) {
    return {
      ok: false,
      error: "Solo se puede editar una oferta en borrador o en negociación.",
    };
  }

  const { offerId, ...patch } = input;
  await deps.updateOffer(offerId, patch);
  return { ok: true };
}

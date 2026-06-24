import { canTransitionOffer, OFFER_STATUS_LABELS, type OfferStatus } from "../schema";

export type CambiarEstadoInput = {
  offerId: string;
  toStatus: OfferStatus;
};

export type CambiarEstadoContext = {
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
};

export type CambiarEstadoDeps = {
  getOffer: (
    offerId: string,
    organizationId: string,
  ) => Promise<{ id: string; status: OfferStatus; applicationId: string; jobId: string } | null>;
  /** Cambio de estado simple (sent / negotiation / rejected). */
  updateStatus: (offerId: string, toStatus: OfferStatus) => Promise<void>;
  /**
   * Aceptar la oferta: además de marcar accepted, contrata al candidato (application→hired
   * con su evento) y cierra la búsqueda (job→closed). Atómico en la capa data.
   */
  acceptOffer: (offerId: string) => Promise<void>;
};

export async function cambiarEstadoOferta(
  input: CambiarEstadoInput,
  ctx: CambiarEstadoContext,
  deps: CambiarEstadoDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden cambiar el estado de una oferta." };
  }

  const offer = await deps.getOffer(input.offerId, ctx.organizationId);
  if (!offer) {
    return { ok: false, error: "Oferta no encontrada." };
  }

  if (offer.status === input.toStatus) {
    return { ok: false, error: "La oferta ya está en ese estado." };
  }

  if (!canTransitionOffer(offer.status, input.toStatus)) {
    return {
      ok: false,
      error: `No se puede pasar de "${OFFER_STATUS_LABELS[offer.status]}" a "${OFFER_STATUS_LABELS[input.toStatus]}".`,
    };
  }

  // Aceptar dispara los efectos colaterales (contratar + cerrar búsqueda).
  if (input.toStatus === "accepted") {
    await deps.acceptOffer(input.offerId);
  } else {
    await deps.updateStatus(input.offerId, input.toStatus);
  }

  return { ok: true };
}

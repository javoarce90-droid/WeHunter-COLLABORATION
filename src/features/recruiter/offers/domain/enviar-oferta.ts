export type OfferForSend = {
  candidateEmail: string | null;
  title: string;
  body: string | null;
};

export type EnviarOfertaDeps = {
  getOfferDetail: (offerId: string, organizationId: string) => Promise<OfferForSend | null>;
  /** Envío real ya resuelto contra la conexión de Google del recruiter actual (o el error de
   *  "no conectaste tu Google" si no hay conexión/scope) — se resuelve afuera, una sola vez,
   *  no acá. */
  sendEmail: (
    to: string,
    subject: string,
    body: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

/**
 * Envía la carta de oferta ya redactada por email real (Gmail). No decide el cambio de
 * estado de la oferta — eso lo hace `cambiarEstadoOferta`, que llama esto primero y solo
 * avanza a "sent" si el envío tuvo éxito. La autorización (rol `offers.manage`) ya la valida
 * el caller antes de llegar acá — no se duplica.
 */
export async function enviarOferta(
  offerId: string,
  organizationId: string,
  deps: EnviarOfertaDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const offer = await deps.getOfferDetail(offerId, organizationId);
  if (!offer) {
    return { ok: false, error: "Oferta no encontrada." };
  }
  if (!offer.candidateEmail) {
    return { ok: false, error: "El candidato no tiene email cargado." };
  }
  if (!offer.body || !offer.body.trim()) {
    return { ok: false, error: "La carta de oferta está vacía — completala antes de enviar." };
  }

  const subject = `Oferta laboral — ${offer.title}`;
  return deps.sendEmail(offer.candidateEmail, subject, offer.body);
}

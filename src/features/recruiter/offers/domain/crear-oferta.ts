import type { OfferStatus } from "../schema";

export type OfferRow = {
  id: string;
  organizationId: string;
  jobId: string;
  applicationId: string;
  title: string;
  status: OfferStatus;
};

export type CrearOfertaInput = {
  jobId: string;
  applicationId: string;
  title: string;
  salaryAmount?: number;
  salaryCurrency?: string;
  benefits?: string;
  startDate?: string;
  validUntil?: string;
  body?: string;
};

export type CrearOfertaContext = {
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
};

export type CrearOfertaDeps = {
  /** Verifica que la postulación exista, sea de la org y pertenezca a ese job. */
  getApplication: (
    applicationId: string,
    organizationId: string,
  ) => Promise<{ id: string; jobId: string } | null>;
  createOffer: (data: CrearOfertaInput & { organizationId: string; createdBy: string | null }) => Promise<OfferRow>;
};

export async function crearOferta(
  input: CrearOfertaInput,
  ctx: CrearOfertaContext,
  deps: CrearOfertaDeps,
): Promise<{ ok: true; data: OfferRow } | { ok: false; error: string }> {
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden generar ofertas." };
  }

  if (input.title.trim().length === 0) {
    return { ok: false, error: "El puesto es obligatorio." };
  }

  const application = await deps.getApplication(input.applicationId, ctx.organizationId);
  if (!application) {
    return { ok: false, error: "Postulación no encontrada." };
  }
  if (application.jobId !== input.jobId) {
    return { ok: false, error: "La postulación no pertenece a esta búsqueda." };
  }

  const offer = await deps.createOffer({
    ...input,
    organizationId: ctx.organizationId,
    createdBy: ctx.userId || null,
  });

  return { ok: true, data: offer };
}

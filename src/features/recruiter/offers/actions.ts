"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/session";
import {
  crearOfertaSchema,
  editarOfertaSchema,
  cambiarEstadoOfertaSchema,
} from "./schema";
import { crearOferta } from "./domain/crear-oferta";
import { editarOferta } from "./domain/editar-oferta";
import { cambiarEstadoOferta } from "./domain/cambiar-estado-oferta";
import {
  insertOffer,
  updateOfferFields,
  updateOfferStatus,
  acceptOfferTx,
} from "./data/offers.mutations";
import { getOfferStatusRow, getOfferDetail, type OfferDetail } from "./data/offers.queries";
import { getApplicationById } from "../applications/data/applications.queries";
import { getAiProvider } from "@/lib/ai";

export interface OfferActionState {
  error?: string;
}

function parseOfferFields(formData: FormData) {
  return {
    title: formData.get("title"),
    salaryAmount: formData.get("salaryAmount"),
    salaryCurrency: formData.get("salaryCurrency"),
    benefits: formData.get("benefits"),
    startDate: formData.get("startDate"),
    validUntil: formData.get("validUntil"),
    body: formData.get("body"),
  };
}

export async function crearOfertaAction(
  _prev: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const parsed = crearOfertaSchema.safeParse({
    jobId: formData.get("jobId"),
    applicationId: formData.get("applicationId"),
    ...parseOfferFields(formData),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const result = await crearOferta(
    parsed.data,
    { userId: "", organizationId: membership.organizationId, role: membership.role },
    {
      getApplication: (applicationId, organizationId) =>
        getApplicationById(applicationId, organizationId),
      createOffer: insertOffer,
    },
  );

  if (!result.ok) return { error: result.error };

  revalidatePath(`/jobs/${parsed.data.jobId}/ofertas`);
  return {};
}

export async function editarOfertaAction(
  jobId: string,
  _prev: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const parsed = editarOfertaSchema.safeParse({
    offerId: formData.get("offerId"),
    ...parseOfferFields(formData),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const result = await editarOferta(
    parsed.data,
    { organizationId: membership.organizationId, role: membership.role },
    { getOffer: getOfferStatusRow, updateOffer: updateOfferFields },
  );

  if (!result.ok) return { error: result.error };

  revalidatePath(`/jobs/${jobId}/ofertas`);
  return {};
}

/** Redacta (IA mock) el cuerpo de una oferta a partir de los datos del form. */
export async function draftOfferAction(
  jobTitle: string,
  candidateName: string,
  salary: string | null,
): Promise<{ ok: boolean; body?: string; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };
  if (!candidateName.trim() || !jobTitle.trim()) {
    return { ok: false, error: "Elegí el candidato y el puesto primero." };
  }

  const body = await getAiProvider().draftOffer({
    candidateName,
    jobTitle,
    salary: salary && salary.trim() ? salary.trim() : null,
  });
  return { ok: true, body };
}

/** Lectura del detalle de una oferta para precargar el drawer de edición. */
export async function loadOfferDetailAction(offerId: string): Promise<OfferDetail | null> {
  const membership = await getActiveMembership();
  if (!membership) return null;
  return getOfferDetail(offerId, membership.organizationId);
}

export async function cambiarEstadoOfertaAction(
  offerId: string,
  toStatus: string,
  jobId: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = cambiarEstadoOfertaSchema.safeParse({ offerId, toStatus });
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const result = await cambiarEstadoOferta(
    parsed.data,
    { organizationId: membership.organizationId, role: membership.role },
    {
      getOffer: getOfferStatusRow,
      updateStatus: updateOfferStatus,
      acceptOffer: acceptOfferTx,
    },
  );

  if (!result.ok) return { ok: false, error: result.error };

  // Aceptar cierra la búsqueda y contrata → revalidamos las vistas afectadas.
  revalidatePath(`/jobs/${jobId}/ofertas`);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/pipeline`);
  revalidatePath(`/jobs/${jobId}/postulados`);
  revalidatePath(`/jobs`);
  return { ok: true };
}

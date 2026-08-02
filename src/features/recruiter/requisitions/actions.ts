"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { aprobarRequisitionSchema, rechazarRequisitionSchema } from "./schema";
import { aprobarRequisition } from "./domain/aprobar-requisition";
import { rechazarRequisition } from "./domain/rechazar-requisition";
import { getRequisitionStatus } from "./data/requisitions.queries";
import { approveAndCreateJob, rejectRequisition } from "./data/requisitions.mutations";

export interface RequisitionReviewState {
  error?: string;
}

export async function aprobarRequisitionAction(
  _prev: RequisitionReviewState,
  formData: FormData,
): Promise<RequisitionReviewState> {
  const parsed = aprobarRequisitionSchema.safeParse({
    requisitionId: formData.get("requisitionId"),
    reviewNote: formData.get("reviewNote"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);

  const result = await aprobarRequisition(
    parsed.data,
    {
      userId: user?.id ?? null,
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
      membershipId: membership?.id ?? null,
    },
    { getRequisitionStatus, approveAndCreateJob },
  );
  if (!result.ok) return { error: result.error };

  revalidatePath("/requisitions");
  // La búsqueda nace en borrador: mandamos al recruiter a terminar de armarla.
  redirect(`/jobs/${result.data.jobId}/edit`);
}

export async function rechazarRequisitionAction(
  _prev: RequisitionReviewState,
  formData: FormData,
): Promise<RequisitionReviewState> {
  const parsed = rechazarRequisitionSchema.safeParse({
    requisitionId: formData.get("requisitionId"),
    reviewNote: formData.get("reviewNote"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);

  const result = await rechazarRequisition(
    parsed.data,
    {
      userId: user?.id ?? null,
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    { getRequisitionStatus, rejectRequisition },
  );
  if (!result.ok) return { error: result.error };

  revalidatePath("/requisitions");
  revalidatePath(`/requisitions/${parsed.data.requisitionId}`);
  return {};
}

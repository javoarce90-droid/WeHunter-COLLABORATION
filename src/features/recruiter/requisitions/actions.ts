"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import {
  aprobarRequisitionSchema,
  rechazarRequisitionSchema,
  cargarSolicitudSchema,
} from "./schema";
import { aprobarRequisition } from "./domain/aprobar-requisition";
import { rechazarRequisition } from "./domain/rechazar-requisition";
import { cargarSolicitud } from "./domain/cargar-solicitud";
import { getRequisitionStatus } from "./data/requisitions.queries";
import {
  approveAndCreateJob,
  rejectRequisition,
  insertRequisitionFromHM,
} from "./data/requisitions.mutations";
import { getMembershipById } from "@/features/recruiter/team/data/team.queries";

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

export interface CargarSolicitudState {
  error?: string;
}

/** El Hiring Manager carga su propia solicitud (camino Enterprise, §17) — elige a qué
 *  recruiter se la asigna, ese recruiter es quien la revisa. */
export async function cargarSolicitudAction(
  _prev: CargarSolicitudState,
  formData: FormData,
): Promise<CargarSolicitudState> {
  const parsed = cargarSolicitudSchema.safeParse({
    assignedToMembershipId: formData.get("assignedToMembershipId"),
    reason: formData.get("reason"),
    title: formData.get("title"),
    position: formData.get("position"),
    jobArea: formData.get("jobArea"),
    location: formData.get("location"),
    modality: formData.get("modality"),
    seniority: formData.get("seniority"),
    employmentType: formData.get("employmentType"),
    skills: formData.get("skills"),
    budget: formData.get("budget"),
    estimatedStartDate: formData.get("estimatedStartDate"),
    objectives: formData.get("objectives"),
    requirements: formData.get("requirements"),
    responsibilities: formData.get("responsibilities"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);

  const result = await cargarSolicitud(
    {
      ...parsed.data,
      skills: parsed.data.skills ? parsed.data.skills.split(",") : null,
    },
    {
      userId: user?.id ?? null,
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    { getMembership: getMembershipById, createRequisitionFromHM: insertRequisitionFromHM },
  );
  if (!result.ok) return { error: result.error };

  revalidatePath("/requisitions");
  redirect("/requisitions?created=1");
}

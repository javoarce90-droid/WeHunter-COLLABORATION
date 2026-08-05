"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import {
  crearShortlistSchema,
  generarShareSchema,
  revocarShareSchema,
  compartirConHMSchema,
  registrarFeedbackInternoSchema,
} from "./schema";
import { crearShortlist } from "./domain/crear-shortlist";
import { generarShare } from "./domain/generar-share";
import { revocarShare } from "./domain/revocar-share";
import { compartirConHM } from "./domain/compartir-con-hm";
import { registrarFeedbackInterno } from "./domain/registrar-feedback-interno";
import {
  createShortlistWithCandidates,
  filterValidApplications,
  createShare,
  createShareForMembership,
  revokeShare,
  generateShareToken,
  upsertShortlistFeedbackDirect,
} from "./data/shortlists.mutations";
import {
  getShortlistById,
  getShareById,
  getActiveShareForCandidate,
} from "./data/shortlists.queries";
import { getJobForPipeline } from "@/features/recruiter/applications/data/applications.queries";
import { getMembershipById } from "@/features/recruiter/team/data/team.queries";

export interface ShortlistActionState {
  error?: string;
  shareToken?: string;
}

export async function crearShortlistAction(
  _prev: ShortlistActionState,
  formData: FormData,
): Promise<ShortlistActionState> {
  const parsed = crearShortlistSchema.safeParse({
    jobId: formData.get("jobId"),
    name: formData.get("name"),
    applicationIds: formData.getAll("applicationIds"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [membership, user] = await Promise.all([getActiveMembership(), getCurrentUser()]);
  if (!membership || !user) return { error: "No autorizado." };

  const result = await crearShortlist(
    parsed.data,
    { userId: user.id, organizationId: membership.organizationId, role: membership.role },
    {
      getJobById: (jobId, organizationId) => getJobForPipeline(jobId, organizationId),
      filterValidApplications,
      createShortlistWithCandidates,
    },
  );

  if (!result.ok) return { error: result.error };

  revalidatePath(`/jobs/${parsed.data.jobId}/shortlists`);
  return {};
}

export async function generarShareAction(
  _prev: ShortlistActionState,
  formData: FormData,
): Promise<ShortlistActionState> {
  const parsed = generarShareSchema.safeParse({
    shortlistId: formData.get("shortlistId"),
    expiresInDays: formData.get("expiresInDays"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [membership, user] = await Promise.all([getActiveMembership(), getCurrentUser()]);
  if (!membership || !user) return { error: "No autorizado." };

  const result = await generarShare(
    parsed.data,
    { userId: user.id, organizationId: membership.organizationId, role: membership.role },
    {
      getShortlistById,
      generateToken: generateShareToken,
      createShare,
    },
  );

  if (!result.ok) return { error: result.error };

  const jobId = String(formData.get("jobId") ?? "");
  if (jobId) revalidatePath(`/jobs/${jobId}/shortlists`);
  return { shareToken: result.data.token };
}

export async function revocarShareAction(
  _prev: ShortlistActionState,
  formData: FormData,
): Promise<ShortlistActionState> {
  const parsed = revocarShareSchema.safeParse({
    shareId: formData.get("shareId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const result = await revocarShare(
    parsed.data,
    { userId: "", organizationId: membership.organizationId, role: membership.role },
    { getShareById, revokeShare },
  );

  if (!result.ok) return { error: result.error };

  const jobId = String(formData.get("jobId") ?? "");
  if (jobId) revalidatePath(`/jobs/${jobId}/shortlists`);
  return {};
}

/** Compartir interno con un Hiring Manager de la org (§9) — alternativa al link mágico. */
export async function compartirConHMAction(
  _prev: ShortlistActionState,
  formData: FormData,
): Promise<ShortlistActionState> {
  const parsed = compartirConHMSchema.safeParse({
    shortlistId: formData.get("shortlistId"),
    membershipId: formData.get("membershipId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [membership, user] = await Promise.all([getActiveMembership(), getCurrentUser()]);
  if (!membership || !user) return { error: "No autorizado." };

  const result = await compartirConHM(
    parsed.data,
    { userId: user.id, organizationId: membership.organizationId, role: membership.role },
    {
      getShortlistById,
      getMembership: getMembershipById,
      generateToken: generateShareToken,
      createShareForMembership,
    },
  );

  if (!result.ok) return { error: result.error };

  const jobId = String(formData.get("jobId") ?? "");
  if (jobId) revalidatePath(`/jobs/${jobId}/shortlists`);
  return {};
}

export interface FeedbackInternoState {
  error?: string;
}

/** El Hiring Manager deja feedback sobre un candidato de un shortlist compartido con él. */
export async function registrarFeedbackInternoAction(
  _prev: FeedbackInternoState,
  formData: FormData,
): Promise<FeedbackInternoState> {
  const parsed = registrarFeedbackInternoSchema.safeParse({
    shortlistCandidateId: formData.get("shortlistCandidateId"),
    decision: formData.get("decision"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const result = await registrarFeedbackInterno(
    parsed.data,
    { organizationId: membership.organizationId, role: membership.role, membershipId: membership.id },
    { getActiveShareForCandidate, submitFeedback: upsertShortlistFeedbackDirect },
  );
  if (!result.ok) return { error: result.error };

  const shortlistId = String(formData.get("shortlistId") ?? "");
  if (shortlistId) revalidatePath(`/shortlists/${shortlistId}`);
  return {};
}

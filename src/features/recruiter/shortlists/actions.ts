"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import {
  crearShortlistSchema,
  generarShareSchema,
  revocarShareSchema,
} from "./schema";
import { crearShortlist } from "./domain/crear-shortlist";
import { generarShare } from "./domain/generar-share";
import { revocarShare } from "./domain/revocar-share";
import {
  createShortlistWithCandidates,
  filterValidApplications,
  createShare,
  revokeShare,
  generateShareToken,
} from "./data/shortlists.mutations";
import { getShortlistById, getShareById } from "./data/shortlists.queries";
import { getJobForPipeline } from "@/features/recruiter/applications/data/applications.queries";

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

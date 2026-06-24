"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/session";
import {
  invitarMiembro,
  actualizarMiembro,
  ASSIGNABLE_ROLES,
} from "./domain/gestionar-equipo";
import {
  insertInvitation,
  revokeInvitation,
  updateMembership,
} from "./data/team.mutations";
import { getMembershipById } from "./data/team.queries";

const ROLE_ENUM = ["admin", "recruiter", "consultant"] as const;

export async function invitarMiembroAction(
  email: string,
  role: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = z
    .object({ email: z.string().email("Email inválido."), role: z.enum(ROLE_ENUM) })
    .safeParse({ email, role });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [membership, user] = await Promise.all([getActiveMembership(), getCurrentUser()]);
  if (!membership || !user) return { ok: false, error: "No autorizado." };

  const result = await invitarMiembro(
    { email: parsed.data.email, role: parsed.data.role, token: randomUUID() },
    { userId: user.id, organizationId: membership.organizationId, role: membership.role },
    {
      createInvitation: (data) =>
        insertInvitation({ organizationId: membership.organizationId, ...data }),
    },
  );

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/settings");
  return { ok: true };
}

export async function actualizarMiembroAction(
  membershipId: string,
  patch: { role?: string; status?: string },
): Promise<{ ok: boolean; error?: string }> {
  const parsed = z
    .object({
      membershipId: z.string().uuid(),
      role: z.enum(ASSIGNABLE_ROLES as unknown as [string, ...string[]]).optional(),
      status: z.enum(["active", "inactive"]).optional(),
    })
    .safeParse({ membershipId, ...patch });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const [membership, user] = await Promise.all([getActiveMembership(), getCurrentUser()]);
  if (!membership || !user) return { ok: false, error: "No autorizado." };

  const result = await actualizarMiembro(
    {
      membershipId: parsed.data.membershipId,
      role: parsed.data.role as "admin" | "recruiter" | "consultant" | undefined,
      status: parsed.data.status as "active" | "inactive" | undefined,
    },
    { userId: user.id, organizationId: membership.organizationId, role: membership.role },
    { getMembership: getMembershipById, updateMembership },
  );

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/settings");
  return { ok: true };
}

export async function revocarInvitacionAction(
  invitationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { ok: false, error: "Sin permisos." };
  }
  await revokeInvitation(invitationId, membership.organizationId);
  revalidatePath("/settings");
  return { ok: true };
}

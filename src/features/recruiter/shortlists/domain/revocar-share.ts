import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
export type RevocarShareInput = {
  shareId: string;
};

export type RevocarShareContext = {
  userId: string;
  organizationId: string;
  role: OrgRole;
};

export type RevocarShareDeps = {
  getShareById: (
    shareId: string,
    organizationId: string,
  ) => Promise<{ id: string; revokedAt: Date | null } | null>;
  revokeShare: (shareId: string) => Promise<{ revoked: boolean }>;
};

export async function revocarShare(
  input: RevocarShareInput,
  ctx: RevocarShareContext,
  deps: RevocarShareDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!can(ctx.role, "shortlists.manage")) {
    return { ok: false, error: "Tu rol no permite gestionar shortlists." };
  }

  const share = await deps.getShareById(input.shareId, ctx.organizationId);
  if (!share) {
    return { ok: false, error: "Enlace no encontrado." };
  }

  if (share.revokedAt) {
    return { ok: false, error: "El enlace ya estaba revocado." };
  }

  await deps.revokeShare(input.shareId);
  return { ok: true };
}

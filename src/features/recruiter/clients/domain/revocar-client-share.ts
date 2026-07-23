import { ok, err, type Result } from "@/lib/result";
import { canManageRecruiting } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/** Caso de uso: revocar el enlace de acceso de un Cliente (§17, camino Cliente). */

export interface RevocarClientShareInput {
  shareId: string;
}

export interface RevocarClientShareCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

export interface RevocarClientShareDeps {
  getClientShareById(
    shareId: string,
    organizationId: string,
  ): Promise<{ id: string; revokedAt: Date | null } | null>;
  revokeClientShare(shareId: string): Promise<{ revoked: boolean }>;
}

export async function revocarClientShare(
  input: RevocarClientShareInput,
  ctx: RevocarClientShareCtx,
  deps: RevocarClientShareDeps,
): Promise<Result<null>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!canManageRecruiting(ctx.role)) {
    return err("No tenés permisos para revocar enlaces de cliente.");
  }

  const share = await deps.getClientShareById(input.shareId, ctx.organizationId);
  if (!share) {
    return err("Enlace no encontrado.");
  }
  if (share.revokedAt) {
    return err("El enlace ya estaba revocado.");
  }

  await deps.revokeClientShare(input.shareId);
  return ok(null);
}

import { ok, err, type Result } from "@/lib/result";

/**
 * Caso de uso: elegir cuál de los workspaces del usuario está viendo. La lista de
 * memberships reales (traída por el caller con `getMyMemberships()`) es la autorización
 * primaria — nunca se confía en el `organizationId` que manda el cliente sin chequearlo
 * contra las memberships reales de esta persona.
 */

export interface CambiarWorkspaceActivoInput {
  organizationId: string;
}

export interface CambiarWorkspaceActivoCtx {
  memberships: { organizationId: string }[];
}

export function cambiarWorkspaceActivo(
  input: CambiarWorkspaceActivoInput,
  ctx: CambiarWorkspaceActivoCtx,
): Result<{ organizationId: string }> {
  const pertenece = ctx.memberships.some((m) => m.organizationId === input.organizationId);
  if (!pertenece) {
    return err("No pertenecés a ese workspace.");
  }
  return ok({ organizationId: input.organizationId });
}

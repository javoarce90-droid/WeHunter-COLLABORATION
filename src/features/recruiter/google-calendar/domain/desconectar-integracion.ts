import { ok, err, type Result } from "@/lib/result";

export type DesconectarIntegracionCtx = {
  userId: string | null;
  organizationId: string | null;
};

export type DesconectarIntegracionDeps = {
  deleteConnection: (profileId: string, organizationId: string) => Promise<void>;
};

export async function desconectarIntegracion(
  ctx: DesconectarIntegracionCtx,
  deps: DesconectarIntegracionDeps,
): Promise<Result<null>> {
  if (!ctx.userId || !ctx.organizationId) {
    return err("Necesitás estar autenticado en un workspace para desconectar Google Calendar.");
  }

  await deps.deleteConnection(ctx.userId, ctx.organizationId);
  return ok(null);
}

/**
 * Caso de uso: marcar/desmarcar una postulación como favorita (estrella de triage).
 * Es una acción de bajo riesgo: cualquier miembro de la org puede hacerlo. La regla real
 * que cuida es que la postulación exista y pertenezca a la org (lo verifica la dep, que
 * filtra por organization_id; RLS es la red de respaldo).
 */

export type MarcarFavoritoInput = {
  applicationId: string;
  isFavorite: boolean;
};

export type MarcarFavoritoContext = {
  organizationId: string;
};

export type MarcarFavoritoDeps = {
  getApplicationById: (
    applicationId: string,
    organizationId: string,
  ) => Promise<{ id: string } | null>;
  setFavorite: (applicationId: string, isFavorite: boolean) => Promise<void>;
};

export async function marcarFavorito(
  input: MarcarFavoritoInput,
  ctx: MarcarFavoritoContext,
  deps: MarcarFavoritoDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const application = await deps.getApplicationById(
    input.applicationId,
    ctx.organizationId,
  );
  if (!application) {
    return { ok: false, error: "Postulación no encontrada." };
  }

  await deps.setFavorite(input.applicationId, input.isFavorite);
  return { ok: true };
}

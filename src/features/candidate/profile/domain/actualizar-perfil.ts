import { ok, err, type Result } from "@/lib/result";

/**
 * Caso de uso: actualizar el perfil del candidato (nombre completo y, opcionalmente, CV global).
 * Si no se adjunta un CV nuevo, el existente se conserva.
 */

export interface ActualizarPerfilInput {
  fullName: string;
  /** Path del CV actual (si hay), para borrarlo del Storage si se sube uno nuevo. */
  currentCvUrl?: string | null;
}

export interface ActualizarPerfilCtx {
  userId: string | null;
}

export interface ActualizarPerfilDeps {
  /** Presente solo si se adjuntó un archivo de CV nuevo en el request. */
  uploadCv?: () => Promise<{ path: string }>;
  /** Borra un CV del Storage (para no dejar PII huérfana en reemplazos). */
  deleteCv?: (path: string) => Promise<void>;
  updateProfileFields(
    userId: string,
    // cvUrl es opcional: si no viene (undefined) se conserva el actual.
    fields: { fullName: string; cvUrl?: string },
  ): Promise<{ updated: boolean }>;
}

export async function actualizarPerfil(
  input: ActualizarPerfilInput,
  ctx: ActualizarPerfilCtx,
  deps: ActualizarPerfilDeps,
): Promise<Result<{ userId: string }>> {
  if (!ctx.userId) {
    return err("Necesitás estar autenticado para actualizar tu perfil.");
  }

  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    return err("El nombre completo es demasiado corto.");
  }

  // Subida del nuevo CV si se adjuntó
  let newCvUrl: string | undefined;
  if (deps.uploadCv) {
    try {
      newCvUrl = (await deps.uploadCv()).path;
    } catch {
      return err("No se pudo subir el CV. Revisá el archivo e intentá de nuevo.");
    }
  }

  // Actualización de campos en base de datos
  const { updated } = await deps.updateProfileFields(ctx.userId, {
    fullName,
    ...(newCvUrl !== undefined ? { cvUrl: newCvUrl } : {}),
  });

  if (!updated) {
    // Si subimos un CV pero el perfil no se actualizó, limpiamos el archivo huérfano.
    if (newCvUrl && deps.deleteCv) {
      await deps.deleteCv(newCvUrl).catch(() => {});
    }
    return err("El perfil no existe.");
  }

  // Si se subió un nuevo CV y existía uno anterior diferente, borramos el viejo.
  if (
    newCvUrl &&
    input.currentCvUrl &&
    input.currentCvUrl !== newCvUrl &&
    deps.deleteCv
  ) {
    await deps.deleteCv(input.currentCvUrl).catch(() => {});
  }

  return ok({ userId: ctx.userId });
}

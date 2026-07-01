import { ok, err, type Result } from "@/lib/result";

/**
 * Caso de uso: actualizar el perfil del candidato (mock UI-only).
 */

export interface ActualizarPerfilInput {
  fullName: string;
}

export interface ActualizarPerfilCtx {
  userId: string | null;
}

export async function actualizarPerfil(
  input: ActualizarPerfilInput,
  ctx: ActualizarPerfilCtx,
): Promise<Result<{ userId: string }>> {
  if (!ctx.userId) {
    return err("Necesitás estar autenticado para actualizar tu perfil.");
  }

  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    return err("El nombre completo es demasiado corto.");
  }

  // Simulación de actualización exitosa (UI-only)
  return ok({ userId: ctx.userId });
}

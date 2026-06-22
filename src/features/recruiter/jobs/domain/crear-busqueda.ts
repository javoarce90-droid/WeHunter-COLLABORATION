import { ok, err, type Result } from "@/lib/result";
import { canManageRecruiting } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/**
 * Caso de uso: crear una búsqueda (job). Nace como `draft`; se publica después
 * (ver cambiar-estado-busqueda). Autorización primaria: rol + organization.
 *
 * Hook IA (diferido): la generación de la descripción con IA entra cuando WeHunter
 * pase las reglas. Por ahora la descripción la escribe el usuario.
 */

export interface CrearBusquedaInput {
  title: string;
  description?: string | null;
}

export interface CrearBusquedaCtx {
  userId: string | null;
  organizationId: string | null;
  role: OrgRole | null;
}

export interface CrearBusquedaDeps {
  insertJob(args: {
    organizationId: string;
    title: string;
    description: string | null;
    createdBy: string;
  }): Promise<{ jobId: string }>;
}

export async function crearBusqueda(
  input: CrearBusquedaInput,
  ctx: CrearBusquedaCtx,
  deps: CrearBusquedaDeps,
): Promise<Result<{ jobId: string }>> {
  if (!ctx.userId || !ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!canManageRecruiting(ctx.role)) {
    return err("No tenés permisos para crear búsquedas.");
  }

  const title = input.title.trim();
  if (title.length < 3) {
    return err("El título de la búsqueda es demasiado corto.");
  }

  const { jobId } = await deps.insertJob({
    organizationId: ctx.organizationId,
    title,
    description: input.description?.trim() || null,
    createdBy: ctx.userId,
  });

  return ok({ jobId });
}

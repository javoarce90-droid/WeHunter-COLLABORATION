import { ok, err, type Result } from "@/lib/result";
import { can, isClientScoped } from "@/lib/auth/roles";
import type { OrgRole, WorkspaceType } from "@/lib/auth/session";
import {
  normalizeJobDetails,
  type JobDetails,
  type JobDetailsInput,
} from "./job-details";

/**
 * Caso de uso: crear una búsqueda (job). Nace como `draft`; se publica después
 * (ver cambiar-estado-busqueda). Autorización primaria: rol + organization.
 *
 * Hook IA (diferido): la generación de la descripción con IA entra cuando WeHunter
 * pase las reglas. Por ahora la descripción la escribe el usuario.
 */

export interface CrearBusquedaInput extends JobDetailsInput {
  title: string;
  description?: string | null;
}

export interface CrearBusquedaCtx {
  userId: string | null;
  organizationId: string | null;
  role: OrgRole | null;
  /** Membership de quien crea, en esta org — se auto-asigna como responsable único de la
   *  búsqueda (`jobs.assignedTo`). Se reasigna después desde Editar. */
  membershipId: string | null;
  /** Cómo usa el workspace la org — decide si la figura de "cliente asignado" aplica
   *  (ver `isClientScoped`: solo Team; en Enterprise/Freelance el cliente no existe). */
  workspaceType: WorkspaceType | null;
  /** Cliente al que el creador está atado en exclusiva (memberships.assignedClientId).
   *  null/undefined = sin restricción, puede crear para cualquier cliente de la org. */
  assignedClientId?: string | null;
}

export interface CrearBusquedaDeps {
  insertJob(args: {
    organizationId: string;
    title: string;
    description: string | null;
    createdBy: string;
    assignedTo: string;
  } & JobDetails): Promise<{ jobId: string }>;
}

export async function crearBusqueda(
  input: CrearBusquedaInput,
  ctx: CrearBusquedaCtx,
  deps: CrearBusquedaDeps,
): Promise<Result<{ jobId: string }>> {
  if (!ctx.userId || !ctx.organizationId || !ctx.role || !ctx.membershipId) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "jobs.manage")) {
    return err("No tenés permisos para crear búsquedas.");
  }
  // Solo ata al cliente asignado al recruiter externo de un workspace Team — nunca a
  // owner/admin (pueden todo) ni en Enterprise (ahí la figura de "cliente" no existe).
  if (
    isClientScoped(ctx.role, ctx.workspaceType) &&
    ctx.assignedClientId &&
    input.clientId !== ctx.assignedClientId
  ) {
    return err("Solo podés crear búsquedas para tu cliente asignado.");
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
    assignedTo: ctx.membershipId,
    ...normalizeJobDetails(input),
  });

  return ok({ jobId });
}

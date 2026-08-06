import { ok, err, type Result } from "@/lib/result";
import { can, isAssignmentScoped, isClientScoped } from "@/lib/auth/roles";
import type { OrgRole, WorkspaceType } from "@/lib/auth/session";
import {
  normalizeJobDetails,
  type JobDetails,
  type JobDetailsInput,
} from "./job-details";

/** Caso de uso: editar título/descripción y campos ricos de una búsqueda existente. */

export interface EditarBusquedaInput extends JobDetailsInput {
  jobId: string;
  title: string;
  description?: string | null;
}

export interface EditarBusquedaCtx {
  organizationId: string | null;
  role: OrgRole | null;
  /** Roles acotados por asignación (ver `isAssignmentScoped`) solo editan lo propio. */
  membershipId: string | null;
  /** Cómo usa el workspace la org — decide si "cliente asignado" aplica (ver
   *  `isClientScoped`: solo Team; en Enterprise/Freelance el cliente no existe). */
  workspaceType: WorkspaceType | null;
  /** Cliente al que el editor está atado en exclusiva (memberships.assignedClientId).
   *  null/undefined = sin restricción, puede editar el clientId de cualquier búsqueda. */
  assignedClientId?: string | null;
}

export interface EditarBusquedaDeps {
  updateJobFields(
    jobId: string,
    organizationId: string,
    fields: { title: string; description: string | null } & JobDetails,
    scopeToMembershipId?: string,
  ): Promise<{ updated: boolean }>;
}

export async function editarBusqueda(
  input: EditarBusquedaInput,
  ctx: EditarBusquedaCtx,
  deps: EditarBusquedaDeps,
): Promise<Result<{ jobId: string }>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "jobs.manage")) {
    return err("No tenés permisos para editar búsquedas.");
  }

  // Mismo criterio que crearBusqueda: solo ata al cliente asignado al recruiter externo
  // de un workspace Team — nunca a owner/admin, ni en Enterprise (sin figura de cliente).
  if (
    isClientScoped(ctx.role, ctx.workspaceType) &&
    ctx.assignedClientId &&
    input.clientId !== ctx.assignedClientId
  ) {
    return err("Solo podés editar búsquedas de tu cliente asignado.");
  }

  const title = input.title.trim();
  if (title.length < 3) {
    return err("El título de la búsqueda es demasiado corto.");
  }

  const scope = isAssignmentScoped(ctx.role) ? (ctx.membershipId ?? undefined) : undefined;
  const { updated } = await deps.updateJobFields(
    input.jobId,
    ctx.organizationId,
    {
      title,
      description: input.description?.trim() || null,
      ...normalizeJobDetails(input),
    },
    scope,
  );
  if (!updated) {
    return err("La búsqueda no existe.");
  }

  return ok({ jobId: input.jobId });
}

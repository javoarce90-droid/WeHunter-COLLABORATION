import { ok, err, type Result } from "@/lib/result";
import { can, isAssignmentScoped } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import type { Job } from "@/db/schema";

/**
 * Caso de uso: cambiar el estado de una búsqueda. El estado es una máquina simple:
 *
 *   draft ──► open ──► paused ──► open
 *               └──► closed ◄──┘
 *
 * `closed` es terminal. Cualquier estado (salvo `archived`) puede archivarse: a
 * diferencia de `closed`, archivar no es "perdida" sino sacarla de las listas activas.
 * `archived` es terminal — sin desarchivar en esta v1. Las transiciones inválidas se
 * rechazan acá (regla de negocio).
 */

export type JobStatus = Job["status"];

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ["open", "archived"],
  open: ["paused", "closed", "archived"],
  paused: ["open", "closed", "archived"],
  closed: ["archived"],
  archived: [],
};

export function isValidTransition(from: JobStatus, to: JobStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export interface CambiarEstadoInput {
  jobId: string;
  nuevoEstado: JobStatus;
}

export interface CambiarEstadoCtx {
  organizationId: string | null;
  role: OrgRole | null;
  /** Membership de quien actúa — roles acotados por asignación (ver `isAssignmentScoped`)
   *  solo pueden cambiar el estado de una búsqueda propia. */
  membershipId: string | null;
}

export interface CambiarEstadoDeps {
  getJobStatus(
    jobId: string,
    organizationId: string,
    scopeToMembershipId?: string,
  ): Promise<JobStatus | null>;
  updateJobStatus(
    jobId: string,
    organizationId: string,
    nuevoEstado: JobStatus,
  ): Promise<void>;
}

export async function cambiarEstadoBusqueda(
  input: CambiarEstadoInput,
  ctx: CambiarEstadoCtx,
  deps: CambiarEstadoDeps,
): Promise<Result<{ jobId: string; estado: JobStatus }>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "jobs.manage")) {
    return err("No tenés permisos para gestionar búsquedas.");
  }

  const scope = isAssignmentScoped(ctx.role) ? (ctx.membershipId ?? undefined) : undefined;
  const actual = await deps.getJobStatus(input.jobId, ctx.organizationId, scope);
  if (!actual) {
    return err("La búsqueda no existe.");
  }
  if (actual === input.nuevoEstado) {
    return ok({ jobId: input.jobId, estado: actual });
  }
  if (!isValidTransition(actual, input.nuevoEstado)) {
    return err(`No se puede pasar de "${actual}" a "${input.nuevoEstado}".`);
  }

  await deps.updateJobStatus(input.jobId, ctx.organizationId, input.nuevoEstado);
  return ok({ jobId: input.jobId, estado: input.nuevoEstado });
}

import { ok, err, type Result } from "@/lib/result";
import { canManageRecruiting } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import type { Job } from "@/db/schema";

/**
 * Caso de uso: cambiar el estado de una búsqueda. El estado es una máquina simple:
 *
 *   draft ──► open ──► paused ──► open
 *               └──► closed ◄──┘
 *
 * `closed` es terminal. Las transiciones inválidas se rechazan acá (regla de negocio).
 */

export type JobStatus = Job["status"];

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ["open"],
  open: ["paused", "closed"],
  paused: ["open", "closed"],
  closed: [],
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
}

export interface CambiarEstadoDeps {
  getJobStatus(jobId: string, organizationId: string): Promise<JobStatus | null>;
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
  if (!canManageRecruiting(ctx.role)) {
    return err("No tenés permisos para gestionar búsquedas.");
  }

  const actual = await deps.getJobStatus(input.jobId, ctx.organizationId);
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

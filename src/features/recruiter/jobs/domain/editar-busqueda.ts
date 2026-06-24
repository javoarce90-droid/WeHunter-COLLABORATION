import { ok, err, type Result } from "@/lib/result";
import { canManageRecruiting } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
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
}

export interface EditarBusquedaDeps {
  updateJobFields(
    jobId: string,
    organizationId: string,
    fields: { title: string; description: string | null } & JobDetails,
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
  if (!canManageRecruiting(ctx.role)) {
    return err("No tenés permisos para editar búsquedas.");
  }

  const title = input.title.trim();
  if (title.length < 3) {
    return err("El título de la búsqueda es demasiado corto.");
  }

  const { updated } = await deps.updateJobFields(input.jobId, ctx.organizationId, {
    title,
    description: input.description?.trim() || null,
    ...normalizeJobDetails(input),
  });
  if (!updated) {
    return err("La búsqueda no existe.");
  }

  return ok({ jobId: input.jobId });
}

import { ok, err, type Result } from "@/lib/result";
import { can, isAssignmentScoped } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import { cleanAvisoSection, cleanBenefits, type Benefit } from "./job-details";

/**
 * Caso de uso: editar SOLO el contenido del aviso (objetivos/requisitos/responsabilidades/
 * beneficios) desde la tab Aviso. A propósito angosto — a diferencia de `editarBusqueda`, no
 * toca título ni el resto de los ~15 campos de la búsqueda: si tomara `JobDetailsInput`
 * completo y no le llegaran los demás campos, `normalizeJobDetails` los pondría en `null` y
 * borraría silenciosamente jobArea/modalidad/salario/etc.
 */

export interface EditarAvisoBusquedaInput {
  jobId: string;
  objectives?: string | null;
  requirements?: string | null;
  responsibilities?: string | null;
  benefits?: Benefit[] | null;
}

export interface EditarAvisoBusquedaCtx {
  organizationId: string | null;
  role: OrgRole | null;
  /** Roles acotados por asignación (ver `isAssignmentScoped`) solo editan lo propio. */
  membershipId: string | null;
}

export interface EditarAvisoBusquedaDeps {
  updateJobAvisoFields(
    jobId: string,
    organizationId: string,
    fields: {
      objectives: string | null;
      requirements: string | null;
      responsibilities: string | null;
      benefits: Benefit[] | null;
    },
    scopeToMembershipId?: string,
  ): Promise<{ updated: boolean }>;
}

export async function editarAvisoBusqueda(
  input: EditarAvisoBusquedaInput,
  ctx: EditarAvisoBusquedaCtx,
  deps: EditarAvisoBusquedaDeps,
): Promise<Result<{ jobId: string }>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "jobs.manage")) {
    return err("No tenés permisos para editar búsquedas.");
  }

  const scope = isAssignmentScoped(ctx.role) ? (ctx.membershipId ?? undefined) : undefined;
  const { updated } = await deps.updateJobAvisoFields(
    input.jobId,
    ctx.organizationId,
    {
      objectives: cleanAvisoSection("objectives")(input.objectives),
      requirements: cleanAvisoSection("requirements")(input.requirements),
      responsibilities: cleanAvisoSection("responsibilities")(input.responsibilities),
      benefits: cleanBenefits(input.benefits),
    },
    scope,
  );
  if (!updated) {
    return err("La búsqueda no existe.");
  }

  return ok({ jobId: input.jobId });
}

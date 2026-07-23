import { ok, err, type Result } from "@/lib/result";
import { canManageRecruiting } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import type { Job } from "@/db/schema";
import type { JobDetails } from "./job-details";

export interface DuplicarBusquedaInput {
  jobId: string;
}

export interface DuplicarBusquedaCtx {
  userId: string | null;
  organizationId: string | null;
  role: OrgRole | null;
}

export interface DuplicarBusquedaDeps {
  getJobById(jobId: string, organizationId: string): Promise<Job | null>;
  insertJob(
    args: {
      organizationId: string;
      title: string;
      description: string | null;
      createdBy: string;
    } & JobDetails,
  ): Promise<{ jobId: string }>;
}

export async function duplicarBusqueda(
  input: DuplicarBusquedaInput,
  ctx: DuplicarBusquedaCtx,
  deps: DuplicarBusquedaDeps,
): Promise<Result<{ jobId: string }>> {
  if (!ctx.userId || !ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!canManageRecruiting(ctx.role)) {
    return err("No tenés permisos para duplicar búsquedas.");
  }

  const original = await deps.getJobById(input.jobId, ctx.organizationId);
  if (!original) {
    return err("La búsqueda no existe.");
  }

  const details: JobDetails = {
    posting: original.posting,
    clientId: original.clientId,
    position: original.position,
    jobArea: original.jobArea,
    location: original.location,
    modality: original.modality,
    seniority: original.seniority,
    employmentType: original.employmentType,
    salaryMin: original.salaryMin,
    salaryMax: original.salaryMax,
    salaryCurrency: original.salaryCurrency,
    skills: original.skills,
    priority: original.priority,
    deadline: original.deadline,
    vacancies: original.vacancies,
    objectives: original.objectives,
    requirements: original.requirements,
    responsibilities: original.responsibilities,
    benefits: original.benefits,
  };

  const { jobId } = await deps.insertJob({
    organizationId: ctx.organizationId,
    title: `${original.title} (copia)`,
    description: original.description,
    createdBy: ctx.userId,
    ...details,
  });

  return ok({ jobId });
}

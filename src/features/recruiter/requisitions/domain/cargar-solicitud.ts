import { ok, err, type Result } from "@/lib/result";
import { can, canReviewRequisitions } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import type {
  JobArea,
  JobModality,
  JobSeniority,
  EmploymentType,
} from "@/features/recruiter/jobs/domain/job-details";

/**
 * Caso de uso: el Hiring Manager carga su propia solicitud de búsqueda (camino Enterprise
 * del Hiring Request, §17 backlog) — análogo a `solicitarBusqueda` (camino Cliente), pero
 * con contexto de usuario/organización en vez de token, y con un campo que el camino Cliente
 * no tiene: el HM elige a QUÉ recruiter se la asigna, que es quien la revisa (nunca el HM
 * mismo — ver `canReviewRequisitions` en roles.ts).
 */

export const REQUISITION_REASONS = ["new_position", "backfill"] as const;
export type RequisitionReason = (typeof REQUISITION_REASONS)[number];

export type RequisitionDraft = {
  reason: RequisitionReason;
  title: string;
  position: string | null;
  jobArea: JobArea | null;
  location: string | null;
  modality: JobModality | null;
  seniority: JobSeniority | null;
  employmentType: EmploymentType | null;
  skills: string[] | null;
  budget: string | null;
  estimatedStartDate: string | null;
  objectives: string | null;
  requirements: string | null;
  responsibilities: string | null;
};

export type CargarSolicitudInput = {
  assignedToMembershipId: string;
  reason: string;
  title: string;
  position?: string | null;
  jobArea?: JobArea | null;
  location?: string | null;
  modality?: JobModality | null;
  seniority?: JobSeniority | null;
  employmentType?: EmploymentType | null;
  skills?: string[] | null;
  budget?: string | null;
  estimatedStartDate?: string | null;
  objectives?: string | null;
  requirements?: string | null;
  responsibilities?: string | null;
};

export interface CargarSolicitudCtx {
  userId: string | null;
  organizationId: string | null;
  role: OrgRole | null;
}

type EligibleMembership = {
  id: string;
  role: OrgRole;
  status: "active" | "inactive";
};

export interface CargarSolicitudDeps {
  getMembership(membershipId: string, organizationId: string): Promise<EligibleMembership | null>;
  createRequisitionFromHM(args: {
    organizationId: string;
    createdByProfileId: string;
    assignedToMembershipId: string;
    draft: RequisitionDraft;
  }): Promise<{ requisitionId: string }>;
}

const clean = (s?: string | null) => (s?.trim() ? s.trim() : null);

export async function cargarSolicitud(
  input: CargarSolicitudInput,
  ctx: CargarSolicitudCtx,
  deps: CargarSolicitudDeps,
): Promise<Result<{ requisitionId: string }>> {
  if (!ctx.userId || !ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "requisitions.create")) {
    return err("No tenés permisos para cargar solicitudes.");
  }

  const recruiter = await deps.getMembership(input.assignedToMembershipId, ctx.organizationId);
  if (!recruiter) {
    return err("Ese miembro no existe en la organización.");
  }
  if (recruiter.status !== "active") {
    return err("No podés asignarla a un miembro inactivo.");
  }
  if (!canReviewRequisitions(recruiter.role)) {
    return err("Ese miembro no puede revisar solicitudes.");
  }

  if (!REQUISITION_REASONS.includes(input.reason as RequisitionReason)) {
    return err("El motivo de la solicitud no es válido.");
  }

  const title = input.title.trim();
  if (title.length < 3) {
    return err("El título de la búsqueda es demasiado corto.");
  }

  const skills = input.skills?.map((s) => s.trim()).filter(Boolean) ?? [];

  const result = await deps.createRequisitionFromHM({
    organizationId: ctx.organizationId,
    createdByProfileId: ctx.userId,
    assignedToMembershipId: input.assignedToMembershipId,
    draft: {
      reason: input.reason as RequisitionReason,
      title,
      position: clean(input.position),
      jobArea: input.jobArea ?? null,
      location: clean(input.location),
      modality: input.modality ?? null,
      seniority: input.seniority ?? null,
      employmentType: input.employmentType ?? null,
      skills: skills.length ? skills : null,
      budget: clean(input.budget),
      estimatedStartDate: clean(input.estimatedStartDate),
      objectives: clean(input.objectives),
      requirements: clean(input.requirements),
      responsibilities: clean(input.responsibilities),
    },
  });

  return ok(result);
}

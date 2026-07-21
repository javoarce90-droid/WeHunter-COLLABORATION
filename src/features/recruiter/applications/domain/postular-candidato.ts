import type { ApplicationStage } from "../schema";
import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

// ---- Tipos del caso de uso ----

export type ApplicationRow = {
  id: string;
  organizationId: string;
  jobId: string;
  candidateId: string;
  stage: ApplicationStage;
  createdAt: Date;
  updatedAt: Date;
};

/** Etapa de arranque si la org no dejó ninguna otra activa: el tablero siempre necesita una
 *  columna real donde poner al candidato que el recruiter acaba de sumar. */
const FALLBACK_STAGE: ApplicationStage = "screening";

export type PostularInput = {
  jobId: string;
  candidateId: string;
};

export type PostularContext = {
  userId: string;
  organizationId: string;
  role: OrgRole;
};

export type PostularDeps = {
  getJobById: (jobId: string, organizationId: string) => Promise<{ id: string; status: string } | null>;
  getCandidateById: (candidateId: string, organizationId: string) => Promise<{ id: string } | null>;
  findExistingApplication: (jobId: string, candidateId: string) => Promise<{ id: string } | null>;
  /** Etapas activas del tablero, en orden: el candidato sumado por el recruiter entra en la primera. */
  getActiveStages: (organizationId: string) => Promise<ApplicationStage[]>;
  /** `null` = conflicto de unicidad (carrera con otro insert simultáneo, ver applications.mutations). */
  createApplication: (data: {
    organizationId: string;
    jobId: string;
    candidateId: string;
    stage: ApplicationStage;
    pipelineEntered?: boolean;
  }) => Promise<ApplicationRow | null>;
};

// ---- Caso de uso ----

export async function postularCandidato(
  input: PostularInput,
  ctx: PostularContext,
  deps: PostularDeps,
): Promise<{ ok: true; data: ApplicationRow } | { ok: false; error: string }> {
  // Autorización primaria: solo owner/admin/recruiter pueden postular
  if (!can(ctx.role, "applications.add")) {
    return { ok: false, error: "Tu rol no permite postular candidatos." };
  }

  // El job debe existir y pertenecer a la org, y estar abierto
  const job = await deps.getJobById(input.jobId, ctx.organizationId);
  if (!job) {
    return { ok: false, error: "Búsqueda no encontrada." };
  }
  if (job.status === "closed" || job.status === "archived") {
    return { ok: false, error: "No se puede postular a una búsqueda cerrada o archivada." };
  }

  // El candidato debe existir y pertenecer a la org
  const candidate = await deps.getCandidateById(input.candidateId, ctx.organizationId);
  if (!candidate) {
    return { ok: false, error: "Candidato no encontrado." };
  }

  // Un candidato no puede estar dos veces en el mismo job
  const existing = await deps.findExistingApplication(input.jobId, input.candidateId);
  if (existing) {
    return { ok: false, error: "El candidato ya está postulado a esta búsqueda." };
  }

  const activeStages = (await deps.getActiveStages(ctx.organizationId)).filter(
    (s) => s !== "new" && s !== "rejected",
  );
  const application = await deps.createApplication({
    organizationId: ctx.organizationId,
    jobId: input.jobId,
    candidateId: input.candidateId,
    stage: activeStages[0] ?? FALLBACK_STAGE,
    pipelineEntered: true,
  });
  if (!application) {
    return { ok: false, error: "El candidato ya está postulado a esta búsqueda." };
  }

  return { ok: true, data: application };
}

import type { ApplicationStage } from "../schema";

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

export type PostularInput = {
  jobId: string;
  candidateId: string;
};

export type PostularContext = {
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
};

export type PostularDeps = {
  getJobById: (jobId: string, organizationId: string) => Promise<{ id: string; status: string } | null>;
  getCandidateById: (candidateId: string, organizationId: string) => Promise<{ id: string } | null>;
  findExistingApplication: (jobId: string, candidateId: string) => Promise<{ id: string } | null>;
  createApplication: (data: {
    organizationId: string;
    jobId: string;
    candidateId: string;
    stage: ApplicationStage;
  }) => Promise<ApplicationRow>;
};

// ---- Caso de uso ----

export async function postularCandidato(
  input: PostularInput,
  ctx: PostularContext,
  deps: PostularDeps,
): Promise<{ ok: true; data: ApplicationRow } | { ok: false; error: string }> {
  // Autorización primaria: solo owner/admin/recruiter pueden postular
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden postular candidatos directamente." };
  }

  // El job debe existir y pertenecer a la org, y estar abierto
  const job = await deps.getJobById(input.jobId, ctx.organizationId);
  if (!job) {
    return { ok: false, error: "Búsqueda no encontrada." };
  }
  if (job.status === "closed") {
    return { ok: false, error: "No se puede postular a una búsqueda cerrada." };
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

  const application = await deps.createApplication({
    organizationId: ctx.organizationId,
    jobId: input.jobId,
    candidateId: input.candidateId,
    stage: "new",
  });

  return { ok: true, data: application };
}

import { ok, err, type Result } from "@/lib/result";
import type { ApplicationStage } from "@/features/recruiter/applications/schema";
import type { JobArea, JobSeniority, EmploymentType, Benefit } from "@/features/recruiter/jobs/domain/job-details";

export type { ApplicationStage };

/** Vista aplanada de una postulación para la UI del portal (mis-postulaciones). Ensamblada
 * desde datos reales (applications + jobs + organizations + candidates) en
 * applications.queries.ts — el shape queda igual al que ya usaban los componentes de Ale. */
export interface PortalApplication {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  appliedAt: string;
  stage: ApplicationStage;
  fullName: string;
  cvUrl: string | null;
  location: string;
  workplaceType: "Remoto" | "Híbrido" | "Presencial";
  salary: string;
  description: string;
  tags: string[];
  /** Campos ricos del detalle (panel de "mis postulaciones"). Null si el job no los tiene. */
  jobArea: JobArea | null;
  seniority: JobSeniority | null;
  employmentType: EmploymentType | null;
  vacancies: number | null;
  objectives: string | null;
  requirements: string | null;
  responsibilities: string | null;
  benefits: Benefit[] | null;
}

export type EstadoVisibleCandidato = "new" | "screening" | "interview" | "offer" | "hired" | "rejected";

/** Estado del proceso simplificado que ve el candidato (stepper, badges, filtros y
 * notificaciones): las 3 sub-etapas reales de entrevista se agrupan en un único paso
 * "interview" — al candidato no le mostramos el detalle interno de con quién entrevista. */
export function toStepperStage(stage: ApplicationStage): EstadoVisibleCandidato {
  if (stage === "interview_hr" || stage === "interview_tech" || stage === "interview_client") {
    return "interview";
  }
  return stage;
}

/** Única fuente de verdad del texto de cada estado visible — la usan el badge de "Mis
 * postulaciones", el ApplicationStepper y el título de las notificaciones al candidato. */
export const ESTADO_VISIBLE_LABELS: Record<EstadoVisibleCandidato, string> = {
  new: "Postulado",
  screening: "En revisión",
  interview: "Entrevista",
  offer: "Propuesta",
  hired: "Contratado",
  rejected: "Finalizado",
};

/** Regla de negocio: al candidato solo le avisamos cuando cambia su estado VISIBLE, no en
 * transiciones internas que caen dentro del mismo paso (ej. Entrev. RH → Entrev. Técnica
 * son ambas "Entrevista" para el candidato — no son novedad para él). */
export function debeNotificarCandidato(fromStage: ApplicationStage, toStage: ApplicationStage): boolean {
  return toStepperStage(fromStage) !== toStepperStage(toStage);
}

/** El candidato solo puede autogestionar el retiro mientras la postulación sigue en una
 * etapa temprana (Postulado o En revisión). Una vez que arrancó el proceso de entrevistas
 * (o ya se resolvió con oferta/contratación/rechazo), el retiro deja de estar disponible. */
export function puedeRetirarPostulacion(stage: ApplicationStage): boolean {
  const visualStage = toStepperStage(stage);
  return visualStage === "new" || visualStage === "screening";
}

export interface RetirarPostulacionCtx {
  userId: string | null;
}

export interface RetirarPostulacionDeps {
  withdraw: (applicationId: string) => Promise<void>;
}

/** Caso de uso: retirar una postulación (borra la fila vía RPC). La etapa la valida la
 * función SECURITY DEFINER (withdraw_application) contra el dato real en base — no
 * confiamos en una etapa que nos pase el cliente. Si la rechaza (ya avanzó de etapa),
 * devolvemos un error explícito en vez de dejar la excepción sin manejar. */
export async function retirarPostulacion(
  applicationId: string,
  ctx: RetirarPostulacionCtx,
  deps: RetirarPostulacionDeps,
): Promise<Result<{ applicationId: string }>> {
  if (!ctx.userId) {
    return err("Necesitás estar autenticado.");
  }
  if (!applicationId.trim()) {
    return err("Postulación inválida.");
  }

  try {
    await deps.withdraw(applicationId);
  } catch {
    return err("No se pudo retirar la postulación: ya no está disponible en esta etapa del proceso.");
  }
  return ok({ applicationId });
}

import { ok, err, type Result } from "@/lib/result";
import type { ApplicationStage } from "@/features/recruiter/applications/schema";

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
}

/** ApplicationStepper (UI de Ale) solo distingue 5 pasos visuales; las 3 sub-etapas reales de
 * entrevista se agrupan en un único paso "interview". */
export function toStepperStage(
  stage: ApplicationStage,
): "new" | "screening" | "interview" | "offer" | "hired" | "rejected" {
  if (stage === "interview_hr" || stage === "interview_tech" || stage === "interview_client") {
    return "interview";
  }
  return stage;
}

export interface RetirarPostulacionCtx {
  userId: string | null;
}

export interface RetirarPostulacionDeps {
  withdraw: (applicationId: string) => Promise<void>;
}

/** Caso de uso: retirar una postulación (fire-and-forget, borra la fila vía RPC). */
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

  await deps.withdraw(applicationId);
  return ok({ applicationId });
}

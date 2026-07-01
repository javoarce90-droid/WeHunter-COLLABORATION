import { z } from "zod";

/** Etapas del pipeline (espeja el enum `application_stage` del schema Drizzle).
 *  Orden = orden de las columnas en el kanban. */
export const APPLICATION_STAGES = [
  "new",
  "screening",
  "interview",
  "interview_hr",
  "interview_tech",
  "interview_client",
  "offer",
  "hired",
  "rejected",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  new: "Nuevo",
  screening: "Screening",
  interview: "Entrevista",
  interview_hr: "Entrev. RH",
  interview_tech: "Entrev. Técnica",
  interview_client: "Entrev. Cliente",
  offer: "Oferta",
  hired: "Contratado",
  rejected: "Descartado",
};

/** Etapas de cierre: no se puede salir de ellas por movimiento normal (drag/menú).
 *  Hoy solo "hired" — a diferencia de "rejected", que es una etapa operativa más
 *  (puede haber reevaluaciones/reactivaciones) y se mueve libremente en ambas direcciones. */
export const CLOSING_STAGES: ApplicationStage[] = ["hired"];

export function isClosingStage(stage: ApplicationStage): boolean {
  return CLOSING_STAGES.includes(stage);
}

/** Schemas de input de la feature de aplicaciones. Validación cerca de la action. */

export const postularCandidatoSchema = z.object({
  jobId: z.string().uuid("ID de búsqueda inválido."),
  candidateId: z.string().uuid("ID de candidato inválido."),
});

export const moverEtapaSchema = z.object({
  applicationId: z.string().uuid("ID de postulación inválido."),
  newStage: z.enum(APPLICATION_STAGES, {
    errorMap: () => ({ message: "Etapa inválida." }),
  }),
});

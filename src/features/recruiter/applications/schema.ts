import { z } from "zod";

/** Etapas del pipeline (espeja el enum `application_stage` del schema Drizzle). */
export const APPLICATION_STAGES = [
  "new",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  new: "Nuevo",
  screening: "Screening",
  interview: "Entrevista",
  offer: "Oferta",
  hired: "Contratado",
  rejected: "Descartado",
};

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

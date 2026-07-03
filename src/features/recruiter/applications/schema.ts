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

/** Motivos de descarte (espeja el enum `rejection_reason` del schema Drizzle).
 *  Lista fija, no configurable por organización. Visible solo para el recruiter. */
export const REJECTION_REASONS = [
  "perfil_no_ajusta",
  "pretension_salarial",
  "proceso_avanzado_otro_candidato",
  "no_disponibilidad",
  "otro",
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  perfil_no_ajusta: "El perfil no ajusta a la búsqueda",
  pretension_salarial: "Pretensión salarial fuera de rango",
  proceso_avanzado_otro_candidato: "Avanzamos con otro candidato",
  no_disponibilidad: "No disponibilidad del candidato",
  otro: "Otro",
};

/** Mensaje base editable para el candidato al descartarlo. {{candidato}} y {{puesto}}
 *  se reemplazan por sus valores reales antes de enviar (soporta lote: cada candidato
 *  recibe su propio nombre). No debe incluir información del motivo interno. */
export const DEFAULT_REJECTION_MESSAGE =
  `Gracias por tu interés en la posición de {{puesto}}.\n` +
  `En esta oportunidad decidimos avanzar con otros perfiles, pero agradecemos mucho ` +
  `tu tiempo e interés en participar del proceso.`;

export const rechazarPostulacionesSchema = z
  .object({
    jobId: z.string().uuid("ID de búsqueda inválido."),
    applicationIds: z
      .array(z.string().uuid("ID de postulación inválido."))
      .min(1, "Elegí al menos una postulación."),
    reason: z.enum(REJECTION_REASONS, {
      errorMap: () => ({ message: "Elegí un motivo de descarte." }),
    }),
    note: z.string().trim().max(500).optional(),
    notifyCandidate: z.boolean(),
    message: z.string().trim().optional(),
  })
  .refine((data) => !data.notifyCandidate || (data.message?.length ?? 0) > 0, {
    message: "Escribí el mensaje para el candidato.",
    path: ["message"],
  });

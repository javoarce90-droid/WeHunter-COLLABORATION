import { z } from "zod";

/** Estados de una oferta (espeja el enum `offer_status` del schema Drizzle). */
export const OFFER_STATUSES = [
  "draft",
  "sent",
  "negotiation",
  "accepted",
  "rejected",
] as const;

export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  negotiation: "En negociación",
  accepted: "Aceptada",
  rejected: "Rechazada",
};

/** Variante de Badge por estado (usa el vocabulario del design system). */
export const OFFER_STATUS_BADGE: Record<
  OfferStatus,
  "muted" | "blue" | "warning" | "success" | "danger"
> = {
  draft: "muted",
  sent: "blue",
  negotiation: "warning",
  accepted: "success",
  rejected: "danger",
};

/** Transiciones válidas de la máquina de estados. accepted/rejected son terminales. */
export const OFFER_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  draft: ["sent", "rejected"],
  sent: ["negotiation", "accepted", "rejected"],
  negotiation: ["sent", "accepted", "rejected"],
  accepted: [],
  rejected: [],
};

export const OFFER_TERMINAL: OfferStatus[] = ["accepted", "rejected"];

export function canTransitionOffer(from: OfferStatus, to: OfferStatus): boolean {
  return OFFER_TRANSITIONS[from].includes(to);
}

/** Solo se edita en borrador o negociación (revisión de términos). */
export function isOfferEditable(status: OfferStatus): boolean {
  return status === "draft" || status === "negotiation";
}

/** Templates estáticos de carta de oferta. El prefill con IA es scope de E8 (diferido). */
export const OFFER_TEMPLATES: { id: string; label: string; body: string }[] = [
  {
    id: "blank",
    label: "En blanco",
    body: "",
  },
  {
    id: "standard",
    label: "Estándar",
    body:
      "Nos complace ofrecerte la posición de {puesto}. Estamos convencidos de que tu " +
      "experiencia es un gran aporte para el equipo.\n\n" +
      "Esperamos tu confirmación. Quedamos a disposición para cualquier consulta.",
  },
  {
    id: "executive",
    label: "Ejecutiva / senior",
    body:
      "Es un placer extenderte una oferta formal para incorporarte como {puesto}.\n\n" +
      "Valoramos tu trayectoria y confiamos en que juntos vamos a lograr grandes resultados. " +
      "Quedamos atentos a tus comentarios sobre la propuesta.",
  },
];

// ---- Schemas de input (validación cerca de la action) ----

const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional(),
);

const optionalInt = z.preprocess(
  (v) => (v === "" || v == null ? undefined : Number(v)),
  z.number().int().positive().optional(),
);

const optionalDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional(), // "YYYY-MM-DD" (columna date)
);

export const crearOfertaSchema = z.object({
  jobId: z.string().uuid("ID de búsqueda inválido."),
  applicationId: z.string().uuid("ID de postulación inválido."),
  title: z.string().trim().min(1, "El puesto es obligatorio."),
  salaryAmount: optionalInt,
  salaryCurrency: optionalText,
  benefits: optionalText,
  startDate: optionalDate,
  validUntil: optionalDate,
  body: optionalText,
});

export const editarOfertaSchema = crearOfertaSchema
  .omit({ jobId: true, applicationId: true })
  .extend({ offerId: z.string().uuid() });

export const cambiarEstadoOfertaSchema = z.object({
  offerId: z.string().uuid(),
  toStatus: z.enum(OFFER_STATUSES),
});

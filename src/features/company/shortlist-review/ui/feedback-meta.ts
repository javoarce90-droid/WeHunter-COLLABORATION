import type { FeedbackDecision } from "../domain/registrar-feedback";

/** Label + variante de Badge por decisión — única fuente, reusada por las 3 vistas que
 *  muestran el feedback (Cliente, HM, recruiter). */
export const FEEDBACK_META: Record<
  FeedbackDecision,
  { label: string; variant: "success" | "danger" | "warning" }
> = {
  approved: { label: "Aprobado", variant: "success" },
  rejected: { label: "Rechazado", variant: "danger" },
  maybe: { label: "Quizás", variant: "warning" },
};

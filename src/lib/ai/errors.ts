/**
 * Errores tipados de la capa de IA. La idea: distinguir "la IA no pudo ahora" (transitorio,
 * el usuario reintenta) de un bug de código, y llevar hasta la UI un mensaje accionable en
 * vez de una excepción cruda o —peor— una respuesta del mock disfrazada de resultado real.
 *
 * Política de degradación (ver gemini.ts):
 * - Operaciones interactivas de un solo tiro (draftJobOffer, interviewReport): se reintenta
 *   con backoff y, si sigue fallando, se tira AiUnavailableError. NO se cae al mock: un
 *   borrador de plantilla que el recruiter cree que escribió la IA es peor que un error claro.
 * - Operaciones en lote (scoreApplication sobre N postulados): no pueden abortar el flujo,
 *   así que degradan al heurístico del mock PERO marcando el resultado como `degraded` para
 *   que la UI lo muestre como "estimación sin IA".
 * - Prosa de bajo riesgo (draftOffer, interviewGuide, reportInsights…): degradan al mock en
 *   silencio; el costo de fricción de un reintento no se justifica.
 */

export type AiFailureReason = "quota" | "error";

export class AiUnavailableError extends Error {
  readonly reason: AiFailureReason;
  /** Mensaje pensado para mostrarle al usuario tal cual (español, accionable). */
  readonly userMessage: string;

  constructor(reason: AiFailureReason, cause?: unknown) {
    const userMessage =
      reason === "quota"
        ? "Se alcanzó el límite de uso de IA por ahora. Reintentá en unos minutos."
        : "La IA no está disponible en este momento. Reintentá en unos minutos.";
    super(userMessage);
    this.name = "AiUnavailableError";
    this.reason = reason;
    this.userMessage = userMessage;
    if (cause !== undefined) this.cause = cause;
  }
}

/** Traduce cualquier error atrapado en una action a un mensaje para el usuario: los
 *  AiUnavailableError ya traen uno bueno; el resto cae a un genérico (y se propaga el log). */
export function aiErrorMessage(err: unknown): string {
  if (err instanceof AiUnavailableError) return err.userMessage;
  return "No se pudo completar la operación con IA. Reintentá en unos minutos.";
}

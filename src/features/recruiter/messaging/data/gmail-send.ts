import { hasGmailSendScope } from "@/features/recruiter/google-calendar/data/oauth-client";
import { sendGmailMessage } from "@/features/recruiter/google-calendar/data/gmail-client";
import type { GoogleCalendarConnection } from "@/features/recruiter/google-calendar/data/connections.queries";
import type { MessageChannel } from "../schema";
import type { SendResult } from "../domain/enviar-mensaje";

/**
 * Decide CÓMO enviar según el canal — I/O puro, sin lógica de negocio (eso ya lo valida
 * `enviarMensaje` con `can()` antes de llegar acá). Whatsapp sigue mock (real descartado por
 * el cliente); email intenta un envío real por Gmail con la conexión del recruiter actual.
 */
export async function sendViaChannel(
  channel: MessageChannel,
  to: string | null,
  subject: string,
  body: string,
  connection: GoogleCalendarConnection | null,
): Promise<SendResult> {
  if (channel === "whatsapp") return { ok: true };

  if (!to) {
    return { ok: false, error: "El candidato no tiene email cargado." };
  }
  if (!connection) {
    return {
      ok: false,
      error: "Conectá tu cuenta de Google en Configuración para poder enviar emails.",
    };
  }
  if (!hasGmailSendScope(connection)) {
    return {
      ok: false,
      error: "Tu conexión de Google es anterior a esta función — reconectala en Configuración.",
    };
  }

  return sendGmailMessage(connection, { to, subject, body });
}

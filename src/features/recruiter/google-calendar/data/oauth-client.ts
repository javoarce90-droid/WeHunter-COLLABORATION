import { google } from "googleapis";

/**
 * calendar.events (sensible) + userinfo.email + gmail.send (sensible) — este último para que
 * el recruiter pueda enviar carta de oferta / contacto / descarte desde su Gmail real (ver
 * `gmail-client.ts` → `sendGmailMessage`).
 *
 * `gmail.readonly`/`gmail.modify` (sync de lectura de hilos, §8 backlog) quedan afuera a
 * propósito: son scopes "restringidos" para Google, que exigen verificación + auditoría de
 * seguridad externa (CASA) — semanas y costo, no viable para el lanzamiento. `gmail.send`,
 * a diferencia de esos, es solo "sensible" (verificación normal de marca, como
 * `calendar.events`) — no exige auditoría CASA. Confirmar igual el estado de verificación del
 * proyecto OAuth en Google Cloud Console antes de deployar: agregar un scope sensible nuevo a
 * un proyecto ya verificado puede disparar una re-revisión del consent screen (días, no
 * instantáneo). Se reincorpora `gmail.readonly` cuando haya tiempo para esa auditoría — ver
 * `messaging/ui/Inbox.tsx` (botón "Sincronizar con Gmail" retirado).
 */
export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.send",
];

const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

/** true si la conexión autorizó gmail.send. Conexiones de antes de este campo (`scope` null)
 *  devuelven false — hay que pedirles reconectar, no asumir que el token alcanza. */
export function hasGmailSendScope(connection: { scope: string | null } | null | undefined): boolean {
  if (!connection?.scope) return false;
  return connection.scope.split(" ").includes(GMAIL_SEND_SCOPE);
}

function redirectUri(appUrl: string): string {
  return `${appUrl}/settings/google-calendar/callback`;
}

/**
 * null si no están configuradas las credenciales (GOOGLE_CLIENT_ID/SECRET) — la integración
 * queda inactiva sin romper nada, mismo criterio que getAiProvider() con GEMINI_API_KEY.
 */
export function getOAuth2Client(appUrl: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri(appUrl));
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

import { google } from "googleapis";

/**
 * Scopes mínimos: crear/editar/borrar eventos (no lectura de todo el calendario) + el email de
 * la cuenta conectada, para mostrar "Conectado como x@gmail.com" en Configuración.
 *
 * `gmail.readonly` (sync de hilos con candidatos, §8 backlog) queda afuera a propósito: es un
 * scope "restringido" para Google, que exige verificación + auditoría de seguridad externa
 * (CASA) — semanas y costo, no viable para el lanzamiento. `calendar.events` es solo
 * "sensible" (verificación normal, más rápida). Se reincorpora Gmail cuando haya tiempo para
 * esa auditoría — ver `messaging/ui/Inbox.tsx` (botón "Sincronizar con Gmail" retirado).
 */
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

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

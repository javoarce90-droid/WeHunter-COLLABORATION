import { google } from "googleapis";
import type { GoogleCalendarConnectionLike } from "../domain/sincronizar-entrevista";
import { updateConnectionAccessToken } from "./connections.mutations";

export type CalendarEventInput = {
  summary: string;
  description: string | null;
  startsAt: Date;
  location: string | null;
  attendeeEmails: string[];
};

const DEFAULT_DURATION_MS = 60 * 60 * 1000; // 1h: no hay campo de duración en interviews todavía.

/**
 * Cliente OAuth con las credenciales de la conexión. Escucha el evento "tokens" que emite el
 * SDK cuando refresca el access token solo (por expiración) y lo persiste — si no, el refresh
 * se pierde y volvemos a pedirlo (o falla) en la próxima llamada.
 */
function buildAuthedClient(connection: GoogleCalendarConnectionLike) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.expiresAt.getTime(),
  });
  auth.on("tokens", (tokens) => {
    if (!tokens.access_token || !tokens.expiry_date) return;
    // Fire-and-forget: no bloqueamos la operación de Calendar por esto.
    void updateConnectionAccessToken(connection.id, {
      accessToken: tokens.access_token,
      expiresAt: new Date(tokens.expiry_date),
    });
  });
  return google.calendar({ version: "v3", auth });
}

function toEventBody(input: CalendarEventInput) {
  return {
    summary: input.summary,
    description: input.description ?? undefined,
    location: input.location ?? undefined,
    start: { dateTime: input.startsAt.toISOString() },
    end: { dateTime: new Date(input.startsAt.getTime() + DEFAULT_DURATION_MS).toISOString() },
    attendees: input.attendeeEmails.map((email) => ({ email })),
  };
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Error al comunicarse con Google Calendar.";
}

export async function createCalendarEvent(
  connection: GoogleCalendarConnectionLike,
  input: CalendarEventInput,
): Promise<{ eventId: string } | { error: string }> {
  try {
    const calendar = buildAuthedClient(connection);
    const res = await calendar.events.insert({
      calendarId: "primary",
      sendUpdates: "all",
      requestBody: toEventBody(input),
    });
    return res.data.id ? { eventId: res.data.id } : { error: "Google no devolvió un id de evento." };
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
}

export async function updateCalendarEvent(
  connection: GoogleCalendarConnectionLike,
  eventId: string,
  input: CalendarEventInput,
): Promise<{ ok: true } | { error: string }> {
  try {
    const calendar = buildAuthedClient(connection);
    await calendar.events.update({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
      requestBody: toEventBody(input),
    });
    return { ok: true };
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
}

export async function deleteCalendarEvent(
  connection: GoogleCalendarConnectionLike,
  eventId: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    const calendar = buildAuthedClient(connection);
    await calendar.events.delete({ calendarId: "primary", eventId, sendUpdates: "all" });
    return { ok: true };
  } catch (err) {
    // 404/410: el evento ya no existe en Google (borrado a mano) — no es un error real acá.
    const status = (err as { code?: number; status?: number })?.code ?? (err as { status?: number })?.status;
    if (status === 404 || status === 410) return { ok: true };
    return { error: toErrorMessage(err) };
  }
}

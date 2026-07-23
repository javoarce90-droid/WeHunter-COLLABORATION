import { google } from "googleapis";
import type { GoogleCalendarConnection } from "./connections.queries";
import { updateConnectionAccessToken } from "./connections.mutations";

export type GmailSyncedMessage = {
  externalId: string;
  direction: "outbound" | "inbound";
  body: string;
  sentAt: Date;
};

/** Mismo patrón que calendar-client.ts: persiste el access token si el SDK lo refresca solo. */
function buildAuthedClient(connection: GoogleCalendarConnection) {
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
    void updateConnectionAccessToken(connection.id, {
      accessToken: tokens.access_token,
      expiresAt: new Date(tokens.expiry_date),
    });
  });
  return google.gmail({ version: "v1", auth });
}

/** El header "From" viaja como `"Nombre" <email@dominio.com>` o directo `email@dominio.com`. */
function extractEmail(headerValue: string | null | undefined): string {
  if (!headerValue) return "";
  const match = headerValue.match(/<([^>]+)>/);
  return (match ? match[1] : headerValue).trim().toLowerCase();
}

const MAX_MESSAGES = 50;

/**
 * Busca en Gmail los mensajes hacia/desde un email puntual (el del candidato) y devuelve un
 * resumen liviano — solo el snippet (preview de texto plano de Gmail), no el cuerpo completo:
 * evita tener que parsear MIME multipart y sanitizar HTML para poder mostrarlo después.
 */
export async function listCandidateGmailMessages(
  connection: GoogleCalendarConnection,
  candidateEmail: string,
): Promise<GmailSyncedMessage[] | { error: string }> {
  try {
    const gmail = buildAuthedClient(connection);
    const list = await gmail.users.messages.list({
      userId: "me",
      q: `from:${candidateEmail} OR to:${candidateEmail}`,
      maxResults: MAX_MESSAGES,
    });

    const results: GmailSyncedMessage[] = [];
    for (const { id } of list.data.messages ?? []) {
      if (!id) continue;
      const msg = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "metadata",
        metadataHeaders: ["From", "Date"],
      });
      const headers = msg.data.payload?.headers ?? [];
      const from = extractEmail(headers.find((h) => h.name === "From")?.value);
      const dateHeader = headers.find((h) => h.name === "Date")?.value;
      const sentAt = dateHeader
        ? new Date(dateHeader)
        : new Date(Number(msg.data.internalDate ?? Date.now()));

      results.push({
        externalId: id,
        direction: from === connection.googleEmail.toLowerCase() ? "outbound" : "inbound",
        body: msg.data.snippet ?? "(sin preview)",
        sentAt,
      });
    }
    return results;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al comunicarse con Gmail." };
  }
}

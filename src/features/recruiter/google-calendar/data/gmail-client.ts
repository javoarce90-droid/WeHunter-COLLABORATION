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
export function buildAuthedClient(connection: GoogleCalendarConnection) {
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

export type SendGmailMessageArgs = {
  to: string;
  subject: string;
  /** Texto plano — sin HTML, matchea lo que el recruiter ya escribe en los textareas de la app. */
  body: string;
};

export type SendGmailMessageResult =
  | { ok: true; externalId: string }
  | { ok: false; error: string };

// RFC 2047: el asunto puede llevar tildes/ñ, así que va MIME-encoded.
function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
}

/** Arma el mensaje RFC 2822 → base64url, como exige `users.messages.send`. Sin "From": Gmail
 *  lo completa solo con la cuenta autenticada. */
function buildRawMessage({ to, subject, body }: SendGmailMessageArgs): string {
  const lines = [
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ];
  return Buffer.from(lines.join("\r\n"), "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Distingue el caso "le falta el scope gmail.send" (403) del resto, para no mostrar un error
 *  genérico cuando la solución real es reconectar Google. */
function mapSendError(err: unknown): string {
  const status =
    (err as { code?: number })?.code ?? (err as { response?: { status?: number } })?.response?.status;
  if (status === 403) {
    return "Tu conexión de Google no tiene permiso para enviar emails. Reconectala en Configuración.";
  }
  return err instanceof Error ? err.message : "Error al enviar el email por Gmail.";
}

/** Envío real por Gmail, en nombre del recruiter conectado. Verificar `hasGmailSendScope`
 *  ANTES de llamar (oauth-client.ts) — acá solo se defiende del caso borde de que igual falle
 *  en runtime (ej. el usuario revocó el permiso a mano desde su cuenta de Google). */
export async function sendGmailMessage(
  connection: GoogleCalendarConnection,
  args: SendGmailMessageArgs,
): Promise<SendGmailMessageResult> {
  try {
    const gmail = buildAuthedClient(connection);
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: buildRawMessage(args) },
    });
    if (!res.data.id) {
      return { ok: false, error: "Gmail no devolvió el id del mensaje enviado." };
    }
    return { ok: true, externalId: res.data.id };
  } catch (err) {
    return { ok: false, error: mapSendError(err) };
  }
}

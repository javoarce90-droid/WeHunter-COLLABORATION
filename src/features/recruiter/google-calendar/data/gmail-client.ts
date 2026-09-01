import { google } from "googleapis";
import type { GoogleCalendarConnection } from "./connections.queries";
import { updateConnectionAccessToken } from "./connections.mutations";

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

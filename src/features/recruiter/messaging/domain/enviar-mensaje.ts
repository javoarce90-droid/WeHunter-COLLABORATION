import type { MessageChannel } from "../schema";
import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

export type EnviarMensajeInput = {
  candidateId: string;
  channel: MessageChannel;
  subject: string;
  body: string;
};

export type EnviarMensajeContext = {
  organizationId: string;
  role: OrgRole;
};

export type SendResult = { ok: true; externalId?: string } | { ok: false; error: string };

export type EnviarMensajeDeps = {
  getCandidate: (
    candidateId: string,
    organizationId: string,
  ) => Promise<{ id: string; email: string | null } | null>;
  /** Devuelve el hilo (candidato, canal), creándolo si no existe. */
  ensureThread: (
    candidateId: string,
    channel: MessageChannel,
  ) => Promise<{ threadId: string }>;
  /** Envío real (solo canal email — whatsapp sigue mock). Devuelve el id del mensaje enviado
   *  cuando aplica, para no perder trazabilidad con lo que Gmail realmente mandó. */
  send: (channel: MessageChannel, to: string | null, subject: string, body: string) => Promise<SendResult>;
  /** Inserta el mensaje saliente y actualiza la actividad del hilo (transaccional). */
  recordOutbound: (threadId: string, body: string, externalId?: string) => Promise<void>;
};

/**
 * Envía un mensaje saliente a un candidato por un canal. Canal email: envío real por Gmail
 * (ver `messaging/data/gmail-send.ts`) — si falla, NO se registra en el historial (no hay que
 * dejar un registro de "enviado" que en realidad no salió). Canal whatsapp: sigue mock (real
 * fue descartado por el cliente, se queda con click-to-chat). La regla cuida rol + existencia.
 */
export async function enviarMensaje(
  input: EnviarMensajeInput,
  ctx: EnviarMensajeContext,
  deps: EnviarMensajeDeps,
): Promise<{ ok: true; threadId: string } | { ok: false; error: string }> {
  if (!can(ctx.role, "messaging.send")) {
    return { ok: false, error: "Tu rol no permite enviar mensajes." };
  }

  if (input.body.trim().length === 0) {
    return { ok: false, error: "El mensaje no puede estar vacío." };
  }

  const candidate = await deps.getCandidate(input.candidateId, ctx.organizationId);
  if (!candidate) {
    return { ok: false, error: "Candidato no encontrado." };
  }

  const sendResult = await deps.send(input.channel, candidate.email, input.subject, input.body);
  if (!sendResult.ok) {
    return { ok: false, error: sendResult.error };
  }

  const { threadId } = await deps.ensureThread(input.candidateId, input.channel);
  await deps.recordOutbound(threadId, input.body, sendResult.externalId);
  return { ok: true, threadId };
}

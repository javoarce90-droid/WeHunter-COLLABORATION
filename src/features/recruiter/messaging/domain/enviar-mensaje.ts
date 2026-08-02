import type { MessageChannel } from "../schema";
import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

export type EnviarMensajeInput = {
  candidateId: string;
  channel: MessageChannel;
  body: string;
};

export type EnviarMensajeContext = {
  organizationId: string;
  role: OrgRole;
};

export type EnviarMensajeDeps = {
  getCandidate: (
    candidateId: string,
    organizationId: string,
  ) => Promise<{ id: string } | null>;
  /** Devuelve el hilo (candidato, canal), creándolo si no existe. */
  ensureThread: (
    candidateId: string,
    channel: MessageChannel,
  ) => Promise<{ threadId: string }>;
  /** Inserta el mensaje saliente y actualiza la actividad del hilo (transaccional). */
  recordOutbound: (threadId: string, body: string) => Promise<void>;
};

/**
 * Envía (mock) un mensaje saliente a un candidato por un canal. El envío en sí sigue sin
 * integración real (se registra como historial, no sale de verdad) — la lectura de Gmail SÍ
 * es real (ver sincronizar-gmail.ts), pero es un caso de uso separado, de solo lectura.
 * La regla cuida rol + existencia.
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

  const { threadId } = await deps.ensureThread(input.candidateId, input.channel);
  await deps.recordOutbound(threadId, input.body);
  return { ok: true, threadId };
}

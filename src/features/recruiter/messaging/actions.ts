"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { getCandidateById } from "../candidates/data/candidates.queries";
import { getConnectionByProfile } from "../google-calendar/data/connections.queries";
import { enviarMensaje } from "./domain/enviar-mensaje";
import { sendViaChannel } from "./data/gmail-send";
import { MESSAGE_CHANNELS } from "./schema";
import {
  ensureThread,
  recordOutbound,
  insertTemplate,
  deleteTemplate,
} from "./data/messaging.mutations";
import {
  listThreadMessages,
  getThreadHeader,
  type MessageRow,
  type ThreadHeader,
} from "./data/messaging.queries";
import { can } from "@/lib/auth/roles";

/** Carga la conversación de un hilo (header + mensajes) para el master-detail del inbox. */
export async function loadThreadAction(
  threadId: string,
): Promise<{ header: ThreadHeader; messages: MessageRow[] } | null> {
  const membership = await getActiveMembership();
  if (!membership) return null;
  const header = await getThreadHeader(threadId, membership.organizationId);
  if (!header) return null;
  const messages = await listThreadMessages(threadId, membership.organizationId);
  return { header, messages };
}

export async function enviarMensajeAction(
  candidateId: string,
  channel: string,
  body: string,
): Promise<{ ok: boolean; threadId?: string; error?: string }> {
  const parsed = z
    .object({
      candidateId: z.string().uuid(),
      channel: z.enum(MESSAGE_CHANNELS),
      body: z.string().trim().min(1),
    })
    .safeParse({ candidateId, channel, body });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) return { ok: false, error: "No autorizado." };
  const org = membership.organizationId;

  // Solo hace falta resolver la conexión si el canal es email — whatsapp sigue mock.
  const googleConnection =
    parsed.data.channel === "email" ? await getConnectionByProfile(user.id, org) : null;

  const result = await enviarMensaje(
    // El inbox todavía no tiene campo de asunto propio (Inbox.tsx está marcado para rediseño
    // en el backlog) — subject genérico hasta que se le sume ese campo.
    { ...parsed.data, subject: "Novedades sobre tu proceso" },
    { organizationId: org, role: membership.role },
    {
      getCandidate: getCandidateById,
      ensureThread: (cId, ch) => ensureThread(org, cId, ch),
      send: (ch, to, subject, b) => sendViaChannel(ch, to, subject, b, googleConnection),
      recordOutbound: (threadId, b, externalId) => recordOutbound(org, threadId, b, externalId),
    },
  );

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/messages");
  return { ok: true, threadId: result.threadId };
}

const templateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  channel: z.enum(MESSAGE_CHANNELS),
  body: z.string().trim().min(1, "El cuerpo es obligatorio."),
});

export async function crearTemplateAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    channel: formData.get("channel"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };
  if (!can(membership.role, "messaging.send")) {
    return { error: "Tu rol no permite enviar mensajes." };
  }

  await insertTemplate({ organizationId: membership.organizationId, ...parsed.data });
  revalidatePath("/messages");
  return { ok: true };
}

export async function eliminarTemplateAction(
  templateId: string,
): Promise<{ ok: boolean; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };
  if (!can(membership.role, "messaging.send")) {
    return { ok: false, error: "Tu rol no permite enviar mensajes." };
  }

  await deleteTemplate(templateId, membership.organizationId);
  revalidatePath("/messages");
  return { ok: true };
}

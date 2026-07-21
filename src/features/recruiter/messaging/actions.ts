"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { getCandidateById } from "../candidates/data/candidates.queries";
import { getConnectionByProfile } from "../google-calendar/data/connections.queries";
import { listCandidateGmailMessages } from "../google-calendar/data/gmail-client";
import { enviarMensaje } from "./domain/enviar-mensaje";
import { sincronizarGmail } from "./domain/sincronizar-gmail";
import { MESSAGE_CHANNELS } from "./schema";
import {
  ensureThread,
  recordOutbound,
  recordSyncedMessages,
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

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };
  const org = membership.organizationId;

  const result = await enviarMensaje(
    parsed.data,
    { organizationId: org, role: membership.role },
    {
      getCandidate: getCandidateById,
      ensureThread: (cId, ch) => ensureThread(org, cId, ch),
      recordOutbound: (threadId, b) => recordOutbound(org, threadId, b),
    },
  );

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/messages");
  return { ok: true, threadId: result.threadId };
}

export async function sincronizarGmailAction(
  candidateId: string,
): Promise<{ ok: boolean; synced?: number; error?: string }> {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) return { ok: false, error: "No autorizado." };
  const org = membership.organizationId;

  // Se resuelve una sola vez y se comparte entre getConnection/fetchMessages: evita pedirla
  // dos veces (una para chequear que existe, otra para usarla contra la API de Gmail).
  const connection = await getConnectionByProfile(user.id, org);

  const result = await sincronizarGmail(
    candidateId,
    { organizationId: org, role: membership.role },
    {
      getCandidate: getCandidateById,
      getConnection: async () => connection,
      fetchMessages: (email) =>
        connection
          ? listCandidateGmailMessages(connection, email)
          : Promise.resolve({ error: "Conexión de Google no encontrada." }),
      ensureThread: (cId) => ensureThread(org, cId, "email"),
      recordSyncedMessages: (threadId, items) => recordSyncedMessages(org, threadId, items),
    },
  );

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/messages");
  return { ok: true, synced: result.data.synced };
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

import { eq, and, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { messageThreads, messages, messageTemplates } from "@/db/schema";
import type { MessageChannel } from "../schema";

/** Devuelve el hilo (candidato, canal), creándolo si no existe (upsert por el índice único). */
export async function ensureThread(
  organizationId: string,
  candidateId: string,
  channel: MessageChannel,
): Promise<{ threadId: string }> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .insert(messageThreads)
        .values({ organizationId, candidateId, channel, createdBy: db.userId })
        .onConflictDoUpdate({
          target: [messageThreads.candidateId, messageThreads.channel],
          set: { updatedAt: new Date() },
        })
        .returning({ id: messageThreads.id }),
    "db.messaging.ensure-thread",
  );
  return { threadId: rows[0]!.id };
}

/** Inserta el mensaje saliente y actualiza la actividad del hilo, en UNA transacción. */
export async function recordOutbound(
  organizationId: string,
  threadId: string,
  body: string,
): Promise<void> {
  const db = await getDb();
  await db.rls(async (tx) => {
    const now = new Date();
    await tx.insert(messages).values({
      organizationId,
      threadId,
      direction: "outbound",
      body,
      createdBy: db.userId,
    });
    await tx
      .update(messageThreads)
      .set({ lastMessageAt: now, updatedAt: now })
      .where(eq(messageThreads.id, threadId));
  }, "db.messaging.record-outbound");
}

export type SyncedMessageInput = {
  externalId: string;
  direction: "outbound" | "inbound";
  body: string;
  sentAt: Date;
};

/**
 * Inserta los mensajes sincronizados desde Gmail que todavía no existían (idempotente vía el
 * índice único `(threadId, externalId)` — reintentar un sync no duplica nada) y adelanta
 * `lastMessageAt` solo si alguno es más nuevo que la actividad ya registrada.
 */
export async function recordSyncedMessages(
  organizationId: string,
  threadId: string,
  items: SyncedMessageInput[],
): Promise<number> {
  if (items.length === 0) return 0;
  const db = await getDb();
  return db.rls(async (tx) => {
    const inserted = await tx
      .insert(messages)
      .values(
        items.map((m) => ({
          organizationId,
          threadId,
          direction: m.direction,
          body: m.body,
          externalId: m.externalId,
          createdAt: m.sentAt,
          updatedAt: m.sentAt,
        })),
      )
      .onConflictDoNothing({ target: [messages.threadId, messages.externalId] })
      .returning({ id: messages.id });

    if (inserted.length > 0) {
      const maxSentAt = items.reduce((max, m) => (m.sentAt > max ? m.sentAt : max), new Date(0));
      await tx
        .update(messageThreads)
        .set({
          lastMessageAt: sql`greatest(${messageThreads.lastMessageAt}, ${maxSentAt})`,
          updatedAt: new Date(),
        })
        .where(eq(messageThreads.id, threadId));
    }
    return inserted.length;
  }, "db.messaging.record-synced");
}

export async function insertTemplate(args: {
  organizationId: string;
  name: string;
  channel: MessageChannel;
  body: string;
}): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) => tx.insert(messageTemplates).values({ ...args, createdBy: db.userId }),
    "db.messaging.insert-template",
  );
}

export async function deleteTemplate(
  templateId: string,
  organizationId: string,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .delete(messageTemplates)
        .where(
          and(
            eq(messageTemplates.id, templateId),
            eq(messageTemplates.organizationId, organizationId),
          ),
        ),
    "db.messaging.delete-template",
  );
}

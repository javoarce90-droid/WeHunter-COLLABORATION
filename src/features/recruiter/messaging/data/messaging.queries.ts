import { and, eq, desc, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { messageThreads, messages, messageTemplates, candidates } from "@/db/schema";
import type { MessageChannel } from "../schema";

export type ThreadListRow = {
  id: string;
  channel: MessageChannel;
  candidateId: string;
  candidateName: string;
  lastMessageAt: Date;
  preview: string | null;
};

/** Inbox: hilos de la org con el nombre del candidato y un preview del último mensaje. */
export async function listThreads(organizationId: string): Promise<ThreadListRow[]> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        id: messageThreads.id,
        channel: messageThreads.channel,
        candidateId: messageThreads.candidateId,
        candidateName: candidates.fullName,
        lastMessageAt: messageThreads.lastMessageAt,
        preview: sql<string | null>`(
          select body from ${messages} m
          where m.thread_id = ${messageThreads.id}
          order by m.created_at desc limit 1
        )`,
      })
      .from(messageThreads)
      .innerJoin(candidates, eq(messageThreads.candidateId, candidates.id))
      .where(eq(messageThreads.organizationId, organizationId))
      .orderBy(desc(messageThreads.lastMessageAt))
      .limit(100),
    "db.messaging.threads",
  );
  return rows.map((r) => ({ ...r, channel: r.channel as MessageChannel }));
}

export type ThreadHeader = {
  id: string;
  channel: MessageChannel;
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
};

export async function getThreadHeader(
  threadId: string,
  organizationId: string,
): Promise<ThreadHeader | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        id: messageThreads.id,
        channel: messageThreads.channel,
        candidateId: messageThreads.candidateId,
        candidateName: candidates.fullName,
        candidateEmail: candidates.email,
      })
      .from(messageThreads)
      .innerJoin(candidates, eq(messageThreads.candidateId, candidates.id))
      .where(and(eq(messageThreads.id, threadId), eq(messageThreads.organizationId, organizationId)))
      .limit(1),
    "db.messaging.thread-header",
  );
  if (!rows[0]) return null;
  return { ...rows[0], channel: rows[0].channel as MessageChannel };
}

export type MessageRow = {
  id: string;
  direction: "outbound" | "inbound";
  body: string;
  createdAt: Date;
};

export async function listThreadMessages(
  threadId: string,
  organizationId: string,
): Promise<MessageRow[]> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        id: messages.id,
        direction: messages.direction,
        body: messages.body,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(and(eq(messages.threadId, threadId), eq(messages.organizationId, organizationId)))
      .orderBy(messages.createdAt)
      .limit(500),
    "db.messaging.thread-messages",
  );
  return rows.map((r) => ({ ...r, direction: r.direction as "outbound" | "inbound" }));
}

export type TemplateRow = {
  id: string;
  name: string;
  channel: MessageChannel;
  body: string;
};

export async function listTemplates(organizationId: string): Promise<TemplateRow[]> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        id: messageTemplates.id,
        name: messageTemplates.name,
        channel: messageTemplates.channel,
        body: messageTemplates.body,
      })
      .from(messageTemplates)
      .where(eq(messageTemplates.organizationId, organizationId))
      .orderBy(messageTemplates.name)
      .limit(100),
    "db.messaging.templates",
  );
  return rows.map((r) => ({ ...r, channel: r.channel as MessageChannel }));
}

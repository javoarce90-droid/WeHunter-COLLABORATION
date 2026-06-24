import { and, eq, desc, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { notifications } from "@/db/schema";

export type NotificationRow = {
  id: string;
  type: "hire" | "team" | "system";
  title: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

/**
 * Notificaciones del usuario actual en la org (RLS las acota a profile_id = auth.uid()).
 * Trae las últimas N + el conteo de no leídas, en una sola transacción RLS.
 */
export async function getNotifications(
  organizationId: string,
): Promise<{ items: NotificationRow[]; unread: number }> {
  const db = await getDb();
  return db.rls(async (tx) => {
    const [items, unreadRows] = await Promise.all([
      tx
        .select({
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          link: notifications.link,
          readAt: notifications.readAt,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(eq(notifications.organizationId, organizationId))
        .orderBy(desc(notifications.createdAt))
        .limit(20),
      tx
        .select({ n: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.organizationId, organizationId),
            isNull(notifications.readAt),
          ),
        ),
    ]);
    return {
      items: items.map((r) => ({ ...r, type: r.type as NotificationRow["type"] })),
      unread: Number(unreadRows[0]?.n ?? 0),
    };
  }, "db.notifications.list");
}

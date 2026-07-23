import { desc, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { notifications } from "@/db/schema";
import type { NotificationRow } from "@/features/recruiter/notifications/data/notifications.queries";

/**
 * Notificaciones del candidato actual (RLS: profile_id = auth.uid()). A diferencia del inbox
 * del recruiter, no se filtra por organization: un candidato puede tener postulaciones en
 * varias orgs distintas y su bandeja las junta todas.
 */
export async function getCandidateNotifications(): Promise<{ items: NotificationRow[]; unread: number }> {
  const db = await getDb();
  if (!db.userId) return { items: [], unread: 0 };
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
        .orderBy(desc(notifications.createdAt))
        .limit(20),
      tx
        .select({ n: sql<number>`count(*)::int` })
        .from(notifications)
        .where(isNull(notifications.readAt)),
    ]);
    return {
      items: items.map((r) => ({ ...r, type: r.type as NotificationRow["type"] })),
      unread: Number(unreadRows[0]?.n ?? 0),
    };
  }, "db.candidate-notifications.list");
}

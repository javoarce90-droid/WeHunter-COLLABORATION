import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { notifications, memberships } from "@/db/schema";

export async function markAllRead(organizationId: string): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(notifications)
        .set({ readAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(notifications.organizationId, organizationId),
            isNull(notifications.readAt),
          ),
        ),
    "db.notifications.mark-read",
  );
}

/**
 * Crea una notificación para cada miembro ACTIVO de la org. RLS: el insert pasa el with_check
 * por pertenencia a la org (cualquier miembro puede notificar a sus compañeros).
 */
export async function notifyOrg(
  organizationId: string,
  notif: { type: "hire" | "team" | "system"; title: string; link?: string | null },
): Promise<void> {
  const db = await getDb();
  await db.rls(async (tx) => {
    const members = await tx
      .select({ profileId: memberships.profileId })
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, organizationId),
          eq(memberships.status, "active"),
        ),
      );
    if (members.length === 0) return;
    await tx.insert(notifications).values(
      members.map((m) => ({
        organizationId,
        profileId: m.profileId,
        type: notif.type,
        title: notif.title,
        link: notif.link ?? null,
      })),
    );
  }, "db.notifications.notify-org");
}

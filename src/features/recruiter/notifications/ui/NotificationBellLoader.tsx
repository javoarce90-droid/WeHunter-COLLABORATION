import { getNotifications } from "../data/notifications.queries";
import { NotificationBell } from "./NotificationBell";

/**
 * Carga async de la campana. Se monta dentro de <Suspense> en el layout para NO bloquear el
 * render de la página con la query de notificaciones (database.md #7).
 */
export async function NotificationBellLoader({ organizationId }: { organizationId: string }) {
  const { items, unread } = await getNotifications(organizationId);
  return <NotificationBell items={items} unread={unread} />;
}

/** Fallback mientras carga: la campana sin contador (no salta el layout). */
export function NotificationBellFallback() {
  return (
    <span className="grid h-9 w-9 place-items-center text-muted" aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    </span>
  );
}

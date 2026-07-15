import { NotificationBell } from "@/features/recruiter/notifications/ui/NotificationBell";
import { getCandidateNotifications } from "../data/notifications.queries";
import { marcarLeidasCandidatoAction } from "../actions";

/**
 * Carga async de la campana del candidato. Reusa el mismo <NotificationBell> del recruiter
 * (es puramente presentacional, recibe items/unread/onMarkRead) — evita duplicar la UI de
 * la bandeja para un segundo tipo de usuario.
 */
export async function CandidateNotificationBellLoader() {
  const { items, unread } = await getCandidateNotifications();
  return (
    <NotificationBell
      items={items}
      unread={unread}
      onMarkRead={marcarLeidasCandidatoAction}
      triggerClassName="text-white/70 hover:bg-white/10 hover:text-white"
    />
  );
}

export { NotificationBellFallback as CandidateNotificationBellFallback } from "@/features/recruiter/notifications/ui/NotificationBellLoader";

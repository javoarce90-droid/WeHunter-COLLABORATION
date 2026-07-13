import { Badge } from "@/components/ui/badge";
import { DisconnectGoogleCalendarButton } from "./DisconnectGoogleCalendarButton";

type Props = {
  configured: boolean;
  connectedEmail: string | null;
};

/**
 * Fila de "Google Calendar" en Configuración > Integraciones. Reemplaza el placeholder
 * estático: conecta la cuenta propia del recruiter (no la del workspace, ver §7 del backlog).
 */
export function GoogleCalendarSection({ configured, connectedEmail }: Props) {
  if (!configured) {
    return (
      <li className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2.5">
        <span className="text-sm font-medium text-text">Google Calendar</span>
        <Badge variant="muted">Sin configurar</Badge>
      </li>
    );
  }

  if (connectedEmail) {
    return (
      <li className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2.5">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-text">Google Calendar</span>
          <span className="text-xs text-muted">Conectado como {connectedEmail}</span>
        </div>
        <DisconnectGoogleCalendarButton />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2.5">
      <span className="text-sm font-medium text-text">Google Calendar</span>
      <a
        href="/settings/google-calendar/connect"
        className="rounded-[var(--radius)] border border-border px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
      >
        Conectar
      </a>
    </li>
  );
}

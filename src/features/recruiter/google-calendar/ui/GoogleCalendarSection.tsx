import { Badge } from "@/components/ui/badge";
import { DisconnectGoogleCalendarButton } from "./DisconnectGoogleCalendarButton";

type Props = {
  configured: boolean;
  connectedEmail: string | null;
};

/**
 * Fila de "Google Calendar" en Configuración > Integraciones. Conecta la cuenta propia del
 * recruiter (no la del workspace, ver §7 del backlog). Es UNA sola conexión: además de
 * Calendar, pide lectura de Gmail (§8) — se lo aclaramos acá para que el consent screen de
 * Google no sea una sorpresa.
 */
export function GoogleCalendarSection({ configured, connectedEmail }: Props) {
  if (!configured) {
    return (
      <li className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2.5">
        <span className="text-sm font-medium text-text">Google Calendar y Gmail</span>
        <Badge variant="muted">Sin configurar</Badge>
      </li>
    );
  }

  if (connectedEmail) {
    return (
      <li className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2.5">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-text">Google Calendar y Gmail</span>
          <span className="text-xs text-muted">Conectado como {connectedEmail}</span>
        </div>
        <DisconnectGoogleCalendarButton />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2.5">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-text">Google Calendar y Gmail</span>
        <span className="text-xs text-muted">Agenda de entrevistas + lectura de tus hilos de email con candidatos</span>
      </div>
      <a
        href="/settings/google-calendar/connect"
        className="rounded-[var(--radius)] border border-border px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
      >
        Conectar
      </a>
    </li>
  );
}

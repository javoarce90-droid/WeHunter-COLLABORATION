import { notFound } from "next/navigation";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { getConnectionByProfile } from "@/features/recruiter/google-calendar/data/connections.queries";
import { isGoogleCalendarConfigured } from "@/features/recruiter/google-calendar/data/oauth-client";
import { GoogleCalendarSection } from "@/features/recruiter/google-calendar/ui/GoogleCalendarSection";
import { SettingsSection } from "@/features/recruiter/settings/ui/SettingsSection";
import { Badge } from "@/components/ui/badge";

const SOON = ["LinkedIn Jobs", "Portales de empleo", "API y webhooks"];

export default async function SettingsIntegrationsPage() {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) notFound();

  const googleConnection = await getConnectionByProfile(user.id, membership.organizationId);

  return (
    <div className="flex flex-col gap-5">
      <SettingsSection title="Integraciones">
        <ul className="flex flex-col gap-2">
          <GoogleCalendarSection
            configured={isGoogleCalendarConfigured()}
            connectedEmail={googleConnection?.googleEmail ?? null}
          />
          <li className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2.5">
            <span className="text-sm font-medium text-text">Gemini (IA)</span>
            <Badge variant="primary">Incluida en tu plan</Badge>
          </li>
          {SOON.map((name) => (
            <li
              key={name}
              className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2.5"
            >
              <span className="text-sm font-medium text-text">{name}</span>
              <Badge variant="muted">Próximamente</Badge>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">
          WhatsApp no figura acá porque no es una integración: donde ves &quot;Enviar WhatsApp&quot; se
          abre un link wa.me con el mensaje ya escrito — la conversación pasa en tu WhatsApp, no en
          WeHunter. No depende de la API de Meta ni de un proveedor pago, y por lo mismo WeHunter no
          ve las respuestas.
        </p>
      </SettingsSection>
    </div>
  );
}

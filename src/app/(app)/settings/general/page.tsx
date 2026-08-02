import { notFound } from "next/navigation";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { getOrganization } from "@/features/recruiter/settings/data/settings.queries";
import { WorkspaceSection } from "@/features/recruiter/settings/ui/WorkspaceSection";
import { SettingsSection } from "@/features/recruiter/settings/ui/SettingsSection";
import { DangerZoneSection } from "@/features/recruiter/settings/ui/DangerZoneSection";
import { Checkbox } from "@/components/ui/checkbox";
import type { OrgRole } from "@/features/recruiter/team/domain/gestionar-equipo";

const NOTIFICATION_PREVIEW = [
  "Nuevo candidato en el pipeline",
  "Entrevista agendada",
  "Cambio de etapa en una postulación",
];

export default async function SettingsGeneralPage() {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) notFound();

  const org = await getOrganization(membership.organizationId);

  const role = membership.role as OrgRole;
  const canEditWorkspace = role === "owner" || role === "admin";

  return (
    <div className="flex flex-col gap-5">
      {org && (
        <SettingsSection
          title="Workspace"
          description="Nombre y logo de tu organización, tal como se ven en toda la app."
        >
          <WorkspaceSection org={org} hasLogo={!!org.logoUrl} canEdit={canEditWorkspace} />
        </SettingsSection>
      )}

      <SettingsSection
        title="Notificaciones"
        description="Pronto vas a poder elegir qué eventos te notifican y por qué canal."
      >
        <ul className="flex flex-col gap-2">
          {NOTIFICATION_PREVIEW.map((label) => (
            <li
              key={label}
              className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2.5 opacity-60"
            >
              <span className="text-sm font-medium text-text">{label}</span>
              <Checkbox aria-label={label} defaultChecked disabled />
            </li>
          ))}
        </ul>
      </SettingsSection>

      {org && role === "owner" && <DangerZoneSection organizationName={org.name} />}
    </div>
  );
}

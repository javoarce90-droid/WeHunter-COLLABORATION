import { notFound } from "next/navigation";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { getOwnProfile, getOrganization } from "@/features/recruiter/settings/data/settings.queries";
import { getConnectionByProfile } from "@/features/recruiter/google-calendar/data/connections.queries";
import { isGoogleCalendarConfigured } from "@/features/recruiter/google-calendar/data/oauth-client";
import { ProfileSection } from "@/features/recruiter/settings/ui/ProfileSection";
import { WorkspaceSection } from "@/features/recruiter/settings/ui/WorkspaceSection";
import { GoogleCalendarSection } from "@/features/recruiter/google-calendar/ui/GoogleCalendarSection";
import { SettingsSection } from "@/features/recruiter/settings/ui/SettingsSection";
import { DangerZoneSection } from "@/features/recruiter/settings/ui/DangerZoneSection";
import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/features/recruiter/team/domain/gestionar-equipo";

/**
 * "General": workspace + perfil personal + conexiones + eliminar workspace, todo en una sola
 * pantalla (antes eran dos tabs, "Perfil" y "General", separadas sin motivo real).
 *
 * Roles fuera de owner/admin tienen esta pestaña acotada a "solo mi perfil" (docs/BACKLOG.md,
 * especificación 2026-08-04): la sección Workspace se OCULTA para ellos, no solo se
 * deshabilita — antes `canEditWorkspace` solo controlaba si los campos eran editables, la
 * sección se veía igual para cualquier rol.
 */
export default async function SettingsPage() {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) notFound();

  const [profile, org, googleConnection] = await Promise.all([
    getOwnProfile(),
    getOrganization(membership.organizationId),
    getConnectionByProfile(user.id, membership.organizationId),
  ]);

  const role = membership.role as OrgRole;
  const canEditWorkspace = role === "owner" || role === "admin";
  // El sourcer no tiene integraciones (docs/BACKLOG.md): sin Conexiones para ese rol.
  const showConnections = can(membership.role, "integrations.connect");

  return (
    <div className="flex flex-col gap-5">
      {org && canEditWorkspace && (
        <SettingsSection
          title="Workspace"
          description="Nombre y logo de tu organización, tal como se ven en toda la app."
        >
          <WorkspaceSection org={org} hasLogo={!!org.logoUrl} canEdit={canEditWorkspace} />
        </SettingsSection>
      )}

      <SettingsSection title="Mi perfil">
        <ProfileSection
          profile={profile}
          email={profile?.email ?? user.email ?? ""}
          hasAvatar={!!profile?.avatarUrl}
          showCommunityCheckbox={can(membership.role, "community.appear")}
        />
      </SettingsSection>

      {showConnections && (
        <SettingsSection title="Conexiones" description="Cuenta personal, no del workspace.">
          <ul className="flex flex-col gap-2">
            <GoogleCalendarSection
              configured={isGoogleCalendarConfigured()}
              connectedEmail={googleConnection?.googleEmail ?? null}
            />
          </ul>
        </SettingsSection>
      )}

      {org && role === "owner" && <DangerZoneSection organizationName={org.name} />}
    </div>
  );
}

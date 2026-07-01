import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { getOwnProfile, getOrganization } from "@/features/recruiter/settings/data/settings.queries";
import { getCareerSiteCoverPublicUrl } from "@/features/recruiter/settings/data/settings.storage";
import { listMembers, listPendingInvitations } from "@/features/recruiter/team/data/team.queries";
import { ProfileSection } from "@/features/recruiter/settings/ui/ProfileSection";
import { PasswordSection } from "@/features/recruiter/settings/ui/PasswordSection";
import { WorkspaceSection } from "@/features/recruiter/settings/ui/WorkspaceSection";
import { TeamSection } from "@/features/recruiter/team/ui/TeamSection";
import { Badge } from "@/components/ui/badge";
import type { OrgRole } from "@/features/recruiter/team/domain/gestionar-equipo";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-bold text-text">{title}</h2>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

const INTEGRATIONS = ["Gmail", "WhatsApp", "Google Calendar", "LinkedIn"];

export default async function SettingsPage() {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) notFound();

  const [profile, org, members, invitations] = await Promise.all([
    getOwnProfile(),
    getOrganization(membership.organizationId),
    listMembers(membership.organizationId),
    listPendingInvitations(membership.organizationId),
  ]);
  const coverUrl = org?.careerSiteCoverUrl ? getCareerSiteCoverPublicUrl(org.careerSiteCoverUrl) : null;

  const role = membership.role as OrgRole;
  const canEditWorkspace = role === "owner" || role === "admin";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-bold text-text">Configuración</h1>
        <p className="text-sm text-muted">Tu perfil, tu equipo y las preferencias del workspace.</p>
      </div>

      <Section title="Mi perfil">
        <ProfileSection
          profile={profile}
          email={profile?.email ?? user.email ?? ""}
          hasAvatar={!!profile?.avatarUrl}
        />
      </Section>

      <Section title="Seguridad" description="Cambiá tu contraseña de acceso.">
        <PasswordSection />
      </Section>

      {org && (
        <Section
          title="Workspace"
          description="Nombre, logo, portada y marca de tu organización — es lo que ven tus candidatos en el Career Site."
        >
          <WorkspaceSection org={org} hasLogo={!!org.logoUrl} coverUrl={coverUrl} canEdit={canEditWorkspace} />
        </Section>
      )}

      <Section
        title="Mi equipo"
        description="Invitá miembros, asigná roles y activá o desactivá accesos."
      >
        <TeamSection
          members={members}
          invitations={invitations}
          currentRole={membership.role as OrgRole}
          currentUserId={user.id}
        />
      </Section>

      <Section title="Mi plan">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-text">Plan Free</p>
            <p className="text-xs text-muted">Sin límites de uso durante la etapa de producto.</p>
          </div>
          <Badge variant="muted">Gestión próximamente</Badge>
        </div>
      </Section>

      <Section
        title="Notificaciones"
        description="Pronto vas a poder elegir qué eventos te notifican y por qué canal."
      >
        <Badge variant="muted">Próximamente</Badge>
      </Section>

      <Section title="Integraciones">
        <ul className="flex flex-col gap-2">
          {INTEGRATIONS.map((name) => (
            <li
              key={name}
              className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2.5"
            >
              <span className="text-sm font-medium text-text">{name}</span>
              <Badge variant="muted">No conectado · Próximamente</Badge>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

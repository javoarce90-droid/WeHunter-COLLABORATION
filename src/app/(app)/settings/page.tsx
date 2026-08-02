import { notFound } from "next/navigation";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { getOwnProfile } from "@/features/recruiter/settings/data/settings.queries";
import { ProfileSection } from "@/features/recruiter/settings/ui/ProfileSection";
import { PasswordSection } from "@/features/recruiter/settings/ui/PasswordSection";
import { SettingsSection } from "@/features/recruiter/settings/ui/SettingsSection";

export default async function SettingsProfilePage() {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) notFound();

  const profile = await getOwnProfile();

  return (
    <div className="flex flex-col gap-5">
      <SettingsSection title="Mi perfil">
        <ProfileSection
          profile={profile}
          email={profile?.email ?? user.email ?? ""}
          hasAvatar={!!profile?.avatarUrl}
        />
      </SettingsSection>

      <SettingsSection title="Seguridad" description="Cambiá tu contraseña de acceso.">
        <PasswordSection />
      </SettingsSection>
    </div>
  );
}

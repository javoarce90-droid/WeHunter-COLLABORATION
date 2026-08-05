import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { SettingsTabs } from "@/features/recruiter/settings/ui/SettingsTabs";

/**
 * Shell de Configuración: header único + pestañas. Cada tab es su propio segmento de ruta
 * (routing-and-tabs.md) y trae solo sus datos; esto solo garantiza sesión + membership.
 */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-bold text-text">Configuración</h1>
        <p className="text-sm text-muted">Tu perfil y las preferencias del workspace.</p>
      </div>
      <SettingsTabs role={membership.role} />
      <div>{children}</div>
    </div>
  );
}

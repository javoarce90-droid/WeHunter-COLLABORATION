import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { SettingsSection } from "@/features/recruiter/settings/ui/SettingsSection";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPlanPage() {
  const membership = await getActiveMembership();
  if (!membership || !can(membership.role, "billing.view")) notFound();

  return (
    <div className="flex flex-col gap-5">
      <SettingsSection title="Mi plan">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-text">Plan Free</p>
            <p className="text-xs text-muted">Sin límites de uso durante la etapa de producto.</p>
          </div>
          <Badge variant="muted">Gestión próximamente</Badge>
        </div>
      </SettingsSection>
    </div>
  );
}

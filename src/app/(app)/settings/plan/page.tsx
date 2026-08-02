import { SettingsSection } from "@/features/recruiter/settings/ui/SettingsSection";
import { Badge } from "@/components/ui/badge";

export default function SettingsPlanPage() {
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

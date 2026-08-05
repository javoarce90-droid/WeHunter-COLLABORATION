import { notFound } from "next/navigation";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { listStageTemplates } from "@/features/recruiter/pipeline-stages/data/job-stage-templates.queries";
import { StageTemplateEditor } from "@/features/recruiter/pipeline-stages/ui/StageTemplateEditor";
import { SettingsSection } from "@/features/recruiter/settings/ui/SettingsSection";

/**
 * Toda organización nueva nace con esta plantilla ya sembrada (ver onboarding/actions.ts y
 * workspace-switcher/actions.ts). Las creadas antes de esta feature no tienen ninguna fila
 * todavía: en vez de sembrar en el servidor durante el render (dos requests concurrentes al
 * mismo GET — ej. el prefetch de <Link> más la navegación real — pueden pisarse y duplicar
 * filas), el backfill es un botón explícito en StageTemplateEditor cuando la lista viene vacía.
 */
export default async function SettingsStagesPage() {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) notFound();
  if (!can(membership.role, "settings.stages_template")) notFound();

  const stages = await listStageTemplates(membership.organizationId);

  return (
    <div className="flex flex-col gap-5">
      <SettingsSection
        title="Plantilla de etapas"
        description="Con estas etapas nace cada búsqueda nueva de este workspace. Editarla acá no afecta a las que ya existen: cada una es dueña de las suyas desde que nace."
      >
        <StageTemplateEditor stages={stages} />
      </SettingsSection>
    </div>
  );
}

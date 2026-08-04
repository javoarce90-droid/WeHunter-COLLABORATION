import type { WorkspaceType } from "@/lib/auth/session";
import { getSetupChecklistCounts, markSetupChecklistCompletedIfDone } from "../data/setup-checklist.queries";
import { calcularProgresoSetup } from "../domain/calcular-progreso-setup";
import { SetupChecklistWidget } from "./SetupChecklistWidget";

/**
 * Carga async del widget flotante, montado en <Suspense> en el layout (no bloquea el render del
 * shell — database.md #7). Fast path: si `setupCompletedAt` ya viene seteado (viaja gratis en
 * getActiveMembership, mismo join cacheado), no corre ninguna query — es el estado estable para
 * la mayoría de las orgs la mayor parte del tiempo.
 */
export async function SetupChecklistWidgetLoader({
  organizationId,
  workspaceType,
  setupCompletedAt,
}: {
  organizationId: string;
  workspaceType: WorkspaceType | null;
  setupCompletedAt: Date | null;
}) {
  if (setupCompletedAt) return null;

  const counts = await getSetupChecklistCounts(organizationId, workspaceType);
  const progreso = calcularProgresoSetup(counts, workspaceType);

  if (progreso.percent >= 100) {
    // No se espera: no debe bloquear el render, y es idempotente (ver la mutation).
    void markSetupChecklistCompletedIfDone(organizationId);
    return null;
  }

  return <SetupChecklistWidget progreso={progreso} />;
}

import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { SettingsSection } from "@/features/recruiter/settings/ui/SettingsSection";
import type { SourcingCreditsSnapshot } from "../data/sourcing-credit-balances.queries";

/**
 * "Tu saldo de Sourcing" en Configuración → Plan — mismo desglose que el chip del topbar, acá
 * en su versión completa (prototipo de créditos aprobado por el cliente, artifact a7feb72b).
 * Recibe el snapshot ya resuelto por la page (Server Component) — evita una segunda transacción
 * por pantalla (`database.md` "una transacción, no N").
 */
export function SourcingCreditsSection({
  snapshot,
}: {
  snapshot: SourcingCreditsSnapshot;
}) {
  const budgetPct =
    snapshot.activeCreditBudget > 0
      ? Math.min(100, Math.round((snapshot.included / snapshot.activeCreditBudget) * 100))
      : 0;

  return (
    <SettingsSection
      title="Tu saldo de Sourcing"
      description="Créditos de Sourcing externo por ciclo de facturación."
    >
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex min-w-[160px] flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-label">
            Disponible
          </span>
          <span className="font-display text-[30px] font-bold tracking-[-0.4px] tabular-nums text-text">
            {snapshot.available}
          </span>
        </div>

        <div className="flex min-w-[220px] flex-1 flex-wrap gap-5">
          <div className="flex min-w-[140px] flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              Incluidos del ciclo
            </span>
            <span className="text-sm font-semibold tabular-nums text-text">
              {snapshot.included} / {snapshot.activeCreditBudget}
            </span>
            <div className="mt-0.5 h-1.5 w-36 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${budgetPct}%` }}
              />
            </div>
          </div>
          <div className="flex min-w-[140px] flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ai" aria-hidden />
              De packs comprados
            </span>
            <span className="text-sm font-semibold tabular-nums text-text">
              {snapshot.purchased}{" "}
              <span className="font-medium text-muted">(no vencen)</span>
            </span>
          </div>
        </div>

        <Tooltip
          label="Próximamente — todavía no se pueden comprar packs de créditos."
          className="ml-auto"
        >
          <Button variant="primary" size="sm" disabled>
            <PlusCircle className="h-3.5 w-3.5" />
            Comprar créditos
          </Button>
        </Tooltip>
      </div>
    </SettingsSection>
  );
}

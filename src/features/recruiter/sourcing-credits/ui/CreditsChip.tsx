"use client";

import { useEffect, useState } from "react";
import { Zap, ChevronDown } from "lucide-react";
import { Menu } from "@/components/ui/menu";
import { getSourcingCreditsBalanceAction } from "../actions";
import { BuyCreditsButton } from "./BuyCreditsButton";

type Snapshot = {
  available: number;
  included: number;
  purchased: number;
  activeCreditBudget: number;
  lowBalance: boolean;
};

/** Colores del chip según el saldo — mismo criterio que el prototipo aprobado (`credit-chip`,
 *  `.low`, `.zero`). */
function chipClasses(snapshot: Snapshot): string {
  if (snapshot.available <= 0) return "bg-[#FEE2E2] text-[#991B1B]";
  if (snapshot.lowBalance) return "bg-[#FEF3C7] text-[#92400E]";
  return "bg-primary-light text-primary-hover hover:border-primary/25";
}

/**
 * Indicador de créditos de Sourcing en el topbar — visible en toda la app, no solo en la
 * pantalla de Sourcing (`limitar-sourcing-ia`, prototipo de créditos aprobado por el cliente,
 * artifact a7feb72b). Carga su propio estado vía Server Action (no depende del shell server-side,
 * que no se re-ejecuta en cada navegación) — mismo patrón que el indicador dentro de
 * `AiJobSourcingResults.tsx`. `null` mientras carga o si el usuario no tiene permiso de usar
 * Sourcing (`candidates.manage`) — el chip simplemente no aparece en ese caso, no es un error.
 */
export function CreditsChip() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getSourcingCreditsBalanceAction();
      if (cancelled) return;
      setLoaded(true);
      if (
        !res.ok ||
        res.enabled === false ||
        res.available === undefined ||
        res.included === undefined ||
        res.purchased === undefined ||
        res.activeCreditBudget === undefined
      ) {
        return;
      }
      setSnapshot({
        available: res.available,
        included: res.included,
        purchased: res.purchased,
        activeCreditBudget: res.activeCreditBudget,
        lowBalance: res.lowBalance ?? false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sin permiso de Sourcing, interruptor de reversión apagado, o todavía cargando: nada que
  // mostrar acá — no es un estado de error, el resto del topbar sigue igual.
  if (!loaded || !snapshot) return null;

  const budgetPct =
    snapshot.activeCreditBudget > 0
      ? Math.min(100, Math.round((snapshot.included / snapshot.activeCreditBudget) * 100))
      : 0;

  return (
    <Menu
      align="end"
      trigger={
        <button
          type="button"
          className={[
            "inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-2 text-xs font-semibold transition-colors",
            chipClasses(snapshot),
          ].join(" ")}
        >
          <Zap className="h-3.5 w-3.5" />
          <span className="tabular-nums">{snapshot.available}</span> créditos
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      }
    >
      <div className="w-[280px] p-4">
        <div className="flex items-baseline justify-between py-1.5 text-[13px]">
          <span className="text-muted">Incluidos este ciclo</span>
          <span className="font-semibold tabular-nums text-text">
            {snapshot.included} / {snapshot.activeCreditBudget}
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${budgetPct}%` }}
          />
        </div>
        <div className="flex items-baseline justify-between py-1.5 text-[13px]">
          <span className="text-muted">De packs comprados</span>
          <span className="font-semibold tabular-nums text-text">{snapshot.purchased}</span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between border-t border-border pt-2.5">
          <span className="text-muted">Disponibles</span>
          <span className="font-display text-base font-bold tabular-nums text-text">
            {snapshot.available}
          </span>
        </div>
        <BuyCreditsButton size="sm" className="mt-3 w-full" />
      </div>
    </Menu>
  );
}

"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast";
import { SOURCING_CREDIT_PACKAGES } from "../domain/credit-packages";

/**
 * Selector de paquete de créditos de Sourcing (prototipo aprobado por el cliente). La compra
 * real todavía no está integrada con dLocal — "Continuar al pago" avisa en vez de simular un
 * pago que no existe (decisión de producto: nunca comunicarle al usuario algo que no pasó).
 */
export function BuyCreditsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [selected, setSelected] = useState(
    () =>
      SOURCING_CREDIT_PACKAGES.find((p) => p.highlighted)?.id ??
      SOURCING_CREDIT_PACKAGES[0]!.id,
  );

  function continuarAlPago() {
    toast({
      message: "La compra de créditos todavía no está disponible — te avisamos apenas esté lista.",
    });
  }

  return (
    <Dialog open={open} onClose={onClose} side="center" title="Comprar créditos de Sourcing">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted">
          No vencen y se suman a tu saldo actual, ni bien se confirme el pago.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {SOURCING_CREDIT_PACKAGES.map((pkg) => {
            const isSelected = pkg.id === selected;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelected(pkg.id)}
                aria-pressed={isSelected}
                className={[
                  "relative flex flex-col items-center gap-1 rounded-[var(--radius)] border px-4 py-5 text-center transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                  isSelected
                    ? "border-primary bg-primary-light"
                    : "border-border bg-surface hover:bg-bg",
                ].join(" ")}
              >
                {pkg.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-1 text-[11px] font-semibold text-white">
                    Más elegido
                  </span>
                )}
                <span className="font-display text-xl font-bold tracking-[-0.3px] text-text">
                  +{pkg.credits}
                </span>
                <span className="text-xs text-muted">créditos</span>
                <span className="mt-2 text-sm font-semibold text-text">
                  USD {pkg.priceUsd.toFixed(2).replace(".", ",")}
                </span>
              </button>
            );
          })}
        </div>
        <Button variant="primary" onClick={continuarAlPago}>
          Continuar al pago
        </Button>
      </div>
    </Dialog>
  );
}

import { Lock, CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BuyCreditsButton } from "./BuyCreditsButton";

/**
 * Estado de bloqueo cuando el saldo de Sourcing llega a 0 (prototipo de créditos aprobado por
 * el cliente, artifact a7feb72b) — reemplaza el aviso de texto plano anterior. Solo bloquea la
 * búsqueda externa; el resto de la app sigue funcionando igual.
 */
export function CreditsBlockedState({
  daysUntilRenewal,
}: {
  daysUntilRenewal: number | null;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
        <Lock className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg font-bold tracking-[-0.3px] text-text">
          Te quedaste sin créditos de Sourcing este ciclo
        </h3>
        <p className="max-w-sm text-sm text-muted">
          Podés esperar la renovación o comprar un pack para seguir buscando afuera ahora
          mismo.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {daysUntilRenewal !== null && (
          <span className={buttonVariants({ variant: "secondary" })}>
            Renueva en {daysUntilRenewal} día{daysUntilRenewal === 1 ? "" : "s"}
          </span>
        )}
        <BuyCreditsButton />
      </div>
      <p className="flex items-center gap-2 text-xs text-muted">
        <CheckCircle2 className="h-4 w-4 text-success" />
        El resto de WeHunter sigue funcionando — Talent Pool, Pipeline, Clientes y Entrevistas
        sin cambios.
      </p>
    </div>
  );
}

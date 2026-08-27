import Link from "next/link";
import type { Plan } from "@/db/schema";
import { SectionCard } from "@/components/ui/section-card";
import { ConnectPlanButton } from "./ConnectPlanButton";
import { formatPrice } from "../plan";

/**
 * Llamado a conectar dLocal Go en Inicio, mientras el workspace está en prueba y todavía no
 * cargó una tarjeta. Es "el componente" del pedido: card visible, no descartable, con la
 * acción real de ir al checkout. Se muestra arriba del checklist de setup.
 */
export function ConnectPlanCard({ plan, daysLeft }: { plan: Plan; daysLeft: number }) {
  const dias = daysLeft === 1 ? "1 día" : `${daysLeft} días`;

  return (
    <SectionCard
      title={`Activá tu plan ${plan.name}`}
      action={
        <span className="shrink-0 text-xs font-semibold text-muted">
          Prueba · {dias} restantes
        </span>
      }
      bodyClassName="flex flex-col gap-4"
    >
      <p className="text-sm text-text">
        Conectá tu tarjeta con dLocal Go y seguí sin interrupciones cuando termine la prueba.
      </p>
      <p className="text-sm text-muted">
        {plan.trialDays} días gratis, después{" "}
        <strong className="font-semibold text-text">
          {formatPrice(plan.price, plan.currency)}/mes
        </strong>
        . No se cobra nada hasta el día {plan.trialDays}.
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <ConnectPlanButton>Conectar dLocal Go</ConnectPlanButton>
        <Link
          href="/settings/plan"
          className="rounded text-sm font-semibold text-primary underline-offset-4 outline-none hover:text-primary-hover hover:underline focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          Ver detalle del plan
        </Link>
      </div>
    </SectionCard>
  );
}

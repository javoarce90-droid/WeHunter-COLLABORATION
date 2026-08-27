import type { Plan, Subscription } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { SettingsSection } from "@/features/recruiter/settings/ui/SettingsSection";
import type { WorkspaceAccess } from "../domain/evaluar-acceso-workspace";
import { ConnectPlanButton } from "./ConnectPlanButton";
import { CancelPlanButton } from "./CancelPlanButton";
import { formatPrice } from "../plan";

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});
const fmt = (d: Date | null) => (d ? dateFmt.format(d) : null);

type BadgeVariant = "primary" | "success" | "warning" | "danger";

/** Estado del plan en `/settings/plan`, derivado del acceso + la suscripción. */
export function PlanStatusPanel({
  access,
  subscription,
  plan,
}: {
  access: WorkspaceAccess;
  subscription: Subscription | null;
  plan: Plan | null;
}) {
  const periodEnd = fmt(subscription?.currentPeriodEndsAt ?? null);
  const trialEnd = fmt(subscription?.trialEndsAt ?? null);

  let badge: { label: string; variant: BadgeVariant };
  let detail: string;
  let action: React.ReactNode = null;

  if (access.state === "trial") {
    badge = { label: "En prueba", variant: "primary" };
    if (access.hasPaymentMethod) {
      detail = trialEnd
        ? `Tu tarjeta ya está conectada. El primer cobro corre el ${trialEnd}.`
        : "Tu tarjeta ya está conectada.";
      action = <CancelPlanButton activeUntilLabel={trialEnd} />;
    } else {
      detail = `Te ${access.daysLeft === 1 ? "queda" : "quedan"} ${
        access.daysLeft === 1 ? "1 día" : `${access.daysLeft} días`
      }. Conectá dLocal Go antes de que termine para no perder el acceso.`;
      action = <ConnectPlanButton>Conectar dLocal Go</ConnectPlanButton>;
    }
  } else if (access.reason === "cancelled_active") {
    badge = { label: "Cancelado", variant: "warning" };
    detail = periodEnd
      ? `Diste de baja el plan. Seguís con acceso hasta el ${periodEnd}.`
      : "Diste de baja el plan.";
    action = <ConnectPlanButton>Reactivar plan</ConnectPlanButton>;
  } else if (access.state === "ok") {
    badge = { label: "Activo", variant: "success" };
    detail = periodEnd
      ? `Próximo cobro el ${periodEnd}.`
      : "Tu plan está al día.";
    action = <CancelPlanButton activeUntilLabel={periodEnd} />;
  } else {
    // blocked — normalmente no se ve acá (lo cubre la pantalla de pago del shell).
    badge = { label: "Inactivo", variant: "danger" };
    detail =
      access.reason === "payment_overdue"
        ? "El último cobro falló. Actualizá tu medio de pago para reactivarlo."
        : "El plan no está activo. Conectá dLocal Go para reactivarlo.";
    action = <ConnectPlanButton>Conectar dLocal Go</ConnectPlanButton>;
  }

  return (
    <SettingsSection title="Mi plan">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-text">
              Plan {plan?.name ?? "—"}
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </p>
            {plan && (
              <p className="mt-1 text-xs text-muted">
                {formatPrice(plan.price, plan.currency)}/mes · {plan.trialDays} días de prueba
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-muted">{detail}</p>

        {action && <div className="flex flex-wrap gap-3 pt-1">{action}</div>}
      </div>
    </SettingsSection>
  );
}

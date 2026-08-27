import { Clock, CreditCard, RotateCcw, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Plan } from "@/db/schema";
import type { OrgRole } from "@/lib/auth/session";
import type { WorkspaceAccessReason } from "../domain/evaluar-acceso-workspace";
import { ConnectPlanButton } from "./ConnectPlanButton";
import { formatPrice, SUPPORT_EMAIL } from "../plan";

/**
 * Reemplaza el contenido del reclutador cuando el workspace quedó bloqueado por falta de
 * pago (prueba vencida, cobro fallido, plan cancelado). El sidebar y el header siguen: esto
 * ocupa el `<main>`, no es un modal. Quien administra la facturación ve la acción para
 * resolverlo; el resto del equipo solo el aviso.
 */

type ReasonKey = Extract<
  WorkspaceAccessReason,
  "trial_expired" | "payment_overdue" | "subscription_cancelled"
>;
type Copy = { icon: LucideIcon; title: string; body: (plan: Plan | null) => string; cta: string };

const OWNER_COPY: Record<ReasonKey, Copy> = {
  trial_expired: {
    icon: Clock,
    title: "Se terminó tu prueba",
    body: (plan) =>
      plan
        ? `Pasaron los ${plan.trialDays} días. Conectá tu tarjeta con dLocal Go y seguí trabajando — ${formatPrice(plan.price, plan.currency)}/mes.`
        : "Se terminó tu período de prueba. Conectá tu tarjeta con dLocal Go y seguí trabajando.",
    cta: "Conectar dLocal Go",
  },
  payment_overdue: {
    icon: CreditCard,
    title: "No pudimos cobrar tu plan",
    body: () =>
      "El último intento de cobro falló. Actualizá tu medio de pago en dLocal Go y volvés a entrar al instante.",
    cta: "Actualizar el pago",
  },
  subscription_cancelled: {
    icon: RotateCcw,
    title: "Tu plan está cancelado",
    body: () =>
      "Diste de baja el plan y el período ya venció. Reactivalo cuando quieras — retomás todo donde lo dejaste.",
    cta: "Reactivar plan",
  },
};

export function PaywallScreen({
  reason,
  role,
  plan,
}: {
  reason: WorkspaceAccessReason;
  role: OrgRole;
  plan: Plan | null;
}) {
  const canManageBilling = role === "owner" || role === "admin";
  const copy =
    canManageBilling && reason in OWNER_COPY
      ? OWNER_COPY[reason as keyof typeof OWNER_COPY]
      : null;

  const Icon = copy?.icon ?? Lock;

  return (
    <div className="mx-auto flex max-w-md animate-view-in flex-col items-center gap-5 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-light text-primary-hover">
        <Icon className="h-5 w-5" aria-hidden />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-xl font-bold tracking-tight text-text">
          {copy ? copy.title : "El workspace está pausado"}
        </h1>
        <p className="text-sm text-muted">
          {copy
            ? copy.body(plan)
            : "El plan de este workspace no está activo. El propietario tiene que reactivarlo para que vuelvas a entrar."}
        </p>
      </div>

      {copy && (
        <div className="pt-1">
          <ConnectPlanButton>{copy.cta}</ConnectPlanButton>
        </div>
      )}

      <p className="text-xs text-muted">
        ¿Un problema con el pago?{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="rounded font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          {SUPPORT_EMAIL}
        </a>
      </p>
    </div>
  );
}

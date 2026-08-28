import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { ToastOnMount } from "@/components/ui/toast-on-mount";
import { getWorkspaceAccess } from "@/features/recruiter/billing/data/workspace-access";
import {
  getSubscriptionByOrg,
  listSubscriptionPayments,
} from "@/features/recruiter/billing/data/subscriptions.queries";
import { getActivePlans } from "@/features/recruiter/billing/data/plans.queries";
import { formatPrice } from "@/features/recruiter/billing/plan";
import { PlanStatusPanel } from "@/features/recruiter/billing/ui/PlanStatusPanel";
import { PaymentHistoryPanel } from "@/features/recruiter/billing/ui/PaymentHistoryPanel";
import { UpgradePlanPanel } from "@/features/recruiter/billing/ui/UpgradePlanPanel";

export default async function SettingsPlanPage() {
  const membership = await getActiveMembership();
  if (!membership || !can(membership.role, "billing.view")) notFound();

  const [access, subscription, payments, plans] = await Promise.all([
    getWorkspaceAccess(),
    getSubscriptionByOrg(membership.organizationId),
    listSubscriptionPayments(membership.organizationId),
    getActivePlans(),
  ]);

  const currentPlan = access?.plan ?? null;
  // Plan superior disponible al que todavía no llegó (hoy: Freelancer → Teams).
  const upgradeTarget = currentPlan
    ? plans.find((p) => p.sortOrder > currentPlan.sortOrder) ?? null
    : null;

  return (
    <div className="flex flex-col gap-5">
      <ToastOnMount param="activada" message="Suscripción conectada. Ya está tu plan." />
      <ToastOnMount
        param="pago_procesando"
        message="Estamos confirmando tu pago con dLocal Go. En un momento se activa tu plan."
        variant="default"
      />
      <ToastOnMount
        param="checkout_error"
        message="No pudimos confirmar la conexión con dLocal Go. Probá de nuevo o escribinos."
        variant="danger"
      />
      <ToastOnMount
        param="checkout"
        message="Cancelaste la conexión con dLocal Go. Podés retomarla cuando quieras."
        variant="default"
      />

      {access && (
        <PlanStatusPanel access={access} subscription={subscription} plan={currentPlan} />
      )}

      {upgradeTarget && (
        <UpgradePlanPanel
          targetCode={upgradeTarget.code}
          targetName={upgradeTarget.name}
          targetPriceLabel={formatPrice(upgradeTarget.price, upgradeTarget.currency)}
          perks={[
            `Hasta ${upgradeTarget.maxMembers} miembros en el workspace`,
            "Roles y permisos por miembro",
            "Asignación de búsquedas y clientes entre recruiters",
          ]}
        />
      )}

      {payments.length > 0 && <PaymentHistoryPanel payments={payments} />}
    </div>
  );
}

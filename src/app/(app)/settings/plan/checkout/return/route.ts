import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser, getActiveMembership } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { getSubscriptionByOrg, getRecordedPaymentIds } from "@/features/recruiter/billing/data/subscriptions.queries";
import { applyReconcile } from "@/features/recruiter/billing/data/subscriptions.mutations";
import { fetchDlocalRemoteState } from "@/features/recruiter/billing/data/dlocal-reconcile";
import { getPlanById } from "@/features/recruiter/billing/data/plans.queries";
import { reconciliarSuscripcion } from "@/features/recruiter/billing/domain/reconciliar-suscripcion";

/**
 * Vuelta del checkout hosteado de dLocal Go (`success_url` del plan). dLocal redirige acá con
 * `?external_id=<organization_id>` cuando el recruiter terminó de cargar la tarjeta. Descubre
 * la suscripción por el email del usuario, la reconcilia y desbloquea el workspace al instante.
 * El webhook (`/api/webhooks/dlocal`) es el respaldo confiable si el browser no completa esto.
 */
export async function GET(request: Request) {
  const reqHeaders = await headers();
  const host = reqHeaders.get("host") ?? "";
  const proto = reqHeaders.get("x-forwarded-proto") ?? "http";
  const planUrl = `${proto}://${host}/settings/plan`;
  const back = (param: string) => NextResponse.redirect(`${planUrl}?${param}=1`);

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user?.email || !membership || !can(membership.role, "billing.view")) {
    return back("checkout_error");
  }

  const externalId = new URL(request.url).searchParams.get("external_id");
  if (externalId && externalId !== membership.organizationId) {
    return back("checkout_error");
  }

  const subscription = await getSubscriptionByOrg(membership.organizationId);
  const plan = subscription?.planId ? await getPlanById(subscription.planId) : null;
  if (!subscription || !plan) return back("checkout_error");

  const remote = await fetchDlocalRemoteState(plan.code, { clientEmail: user.email });
  if (!remote.ok) return back("checkout_error");

  const recordedPaymentIds = await getRecordedPaymentIds(membership.organizationId);
  const result = reconciliarSuscripcion({
    local: { status: subscription.status },
    remote: remote.data,
    recordedPaymentIds,
    now: new Date(),
  });

  if (result.subscriptionPatch) {
    await applyReconcile({
      subscriptionId: subscription.id,
      organizationId: membership.organizationId,
      patch: result.subscriptionPatch,
      payment: result.paymentToRecord,
    });
  }

  return back(result.settled ? "activada" : "pago_procesando");
}

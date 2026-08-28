import { NextResponse } from "next/server";
import { verifyDlocalSignature } from "@/features/recruiter/billing/data/dlocal-webhook";
import { fetchDlocalRemoteState } from "@/features/recruiter/billing/data/dlocal-reconcile";
import { getPlanByIdAsSystem } from "@/features/recruiter/billing/data/plans.queries";
import {
  getSubscriptionByOrgAsSystem,
  getRecordedPaymentIdsAsSystem,
  applyReconcileAsSystem,
} from "@/features/recruiter/billing/data/subscriptions.system-mutations";
import { reconciliarSuscripcion } from "@/features/recruiter/billing/domain/reconciliar-suscripcion";

/**
 * Webhook de dLocal Go (el `notification_url` de cada plan). Sin sesión: la autenticidad la
 * da la firma HMAC. Body real de una suscripción (spike 2026-08-28):
 *   { "invoiceId": "ST-<token>-<n>", "mid": <merchantId>, "subscriptionId": <num>, "externalId": "<organization_id>" }
 * dLocal reintenta cada 10 min por 30 días mientras no reciba 200, así que solo devolvemos
 * != 200 ante un error transitorio real (base caída, dLocal caído).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifyDlocalSignature(rawBody, request.headers.get("authorization"))) {
    return new NextResponse("firma inválida", { status: 401 });
  }

  let payload: { subscriptionId?: number; externalId?: string; invoiceId?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("body ilegible", { status: 400 });
  }

  const { externalId, subscriptionId } = payload;
  if (!externalId || typeof subscriptionId !== "number") {
    // Payload que no reconocemos (¿pago único?, ¿otro evento?). Nada que hacer, no reintentar.
    return NextResponse.json({ ignored: true });
  }

  const subscription = await getSubscriptionByOrgAsSystem(externalId);
  const plan = subscription?.planId ? await getPlanByIdAsSystem(subscription.planId) : null;
  if (!subscription || !plan) {
    return NextResponse.json({ ignored: true });
  }

  const remote = await fetchDlocalRemoteState(plan.code, { subscriptionId });
  if (!remote.ok) {
    // dLocal no respondió: que reintente.
    return new NextResponse(remote.error, { status: 503 });
  }

  const recordedPaymentIds = await getRecordedPaymentIdsAsSystem(externalId);
  const result = reconciliarSuscripcion({
    local: { status: subscription.status },
    remote: remote.data,
    recordedPaymentIds,
    now: new Date(),
  });

  if (result.subscriptionPatch) {
    await applyReconcileAsSystem({
      subscriptionId: subscription.id,
      organizationId: externalId,
      patch: result.subscriptionPatch,
      payment: result.paymentToRecord,
    });
  }

  return NextResponse.json({ ok: true, settled: result.settled });
}

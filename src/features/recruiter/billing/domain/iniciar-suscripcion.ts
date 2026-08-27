import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { ok, err, type Result } from "@/lib/result";

/**
 * Caso de uso: arrancar la conexión con dLocal Go para pagar el plan del workspace.
 * Autoriza (solo quien administra facturación), deja registrada la intención como una
 * suscripción `pending`, y devuelve la URL hosteada de dLocal a la que hay que redirigir al
 * recruiter para que cargue la tarjeta. El cobro real lo maneja dLocal (14 días sin cargo,
 * después mensual) — ver el plan de dLocal Go.
 */

export interface IniciarSuscripcionCtx {
  organizationId: string;
  role: OrgRole;
  /** Email del usuario actual — se lo pasamos a dLocal para prellenar y trazar el pago. */
  userEmail: string | null;
}

export interface IniciarSuscripcionDeps {
  /** Plan que le corresponde al workspace, resuelto desde la tabla `plans`. null = enterprise
   *  o legado sin plan. */
  plan: {
    id: string;
    dlocalSubscribeUrl: string | null;
    dlocalPlanToken: string | null;
  } | null;
  /** Deja una fila de suscripción en `pending` para esta org (idempotente). */
  ensurePendingSubscription: (args: {
    organizationId: string;
    planId: string;
  }) => Promise<void>;
}

export async function iniciarSuscripcion(
  ctx: IniciarSuscripcionCtx,
  deps: IniciarSuscripcionDeps,
): Promise<Result<{ checkoutUrl: string }>> {
  if (!can(ctx.role, "billing.view")) {
    return err("Tu rol no administra la facturación del workspace.");
  }

  const plan = deps.plan;
  if (!plan || !plan.dlocalSubscribeUrl || !plan.dlocalPlanToken) {
    return err("El pago todavía no está disponible. Escribinos y lo activamos.");
  }

  await deps.ensurePendingSubscription({
    organizationId: ctx.organizationId,
    planId: plan.id,
  });

  const url = new URL(plan.dlocalSubscribeUrl);
  url.searchParams.set("external_id", ctx.organizationId);
  if (ctx.userEmail) {
    url.searchParams.set("email", ctx.userEmail);
  }

  return ok({ checkoutUrl: url.toString() });
}

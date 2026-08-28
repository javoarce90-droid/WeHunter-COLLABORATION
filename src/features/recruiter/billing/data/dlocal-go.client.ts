import { ok, err, type Result } from "@/lib/result";
import { getDlocalConfig } from "./dlocal-go.config";

/**
 * Cliente HTTP de la API de dLocal Go (sin SDK). Solo servidor. Auth por
 * `Authorization: Bearer <apiKey>:<secretKey>`. Cada función devuelve `Result` con los pocos
 * campos que consumimos, no el objeto entero de dLocal.
 *
 * Base y credenciales salen de `getDlocalConfig()` según `DLOCALGO_ENV` (sandbox | live).
 */

export interface DlocalPayment {
  id: string;
  status: "PENDING" | "PAID" | "REJECTED" | "CANCELLED" | "EXPIRED";
  amount: number;
  currency: string;
  order_id: string | null;
  description: string | null;
  approved_date: string | null;
  payer: { email: string | null } | null;
}

export interface DlocalSubscription {
  id: number;
  subscription_token: string;
  status: string;
  active: boolean;
  client_email: string | null;
  /** Fecha del próximo cobro programado (ISO). */
  scheduled_date: string | null;
  created_at: string | null;
}

export interface DlocalExecution {
  id: number;
  status: "PENDING" | "COMPLETED" | "DECLINED";
  /** Clave de idempotencia del cobro (== `invoiceId` del webhook). */
  order_id: string;
  /** Lo que realmente entra a la cuenta, en `balance_currency`. */
  amount_received: number;
  balance_currency: string;
  /** En `checkout_currency` — engañoso, no usar para contabilidad. */
  amount_paid: number;
  checkout_currency: string;
  external_id: string | null;
  created_at: string | null;
  /** dLocal anida la suscripción completa en cada ejecución. */
  subscription: DlocalSubscription;
}

export interface DlocalPlanSummary {
  id: number;
  plan_token: string;
  amount: number;
  currency: string;
}

interface Paginated<T> {
  data: T[];
  total_pages: number;
  page: number;
}

async function dlocalFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<Result<T>> {
  const { apiKey, secretKey, apiBaseUrl } = getDlocalConfig();
  if (!apiKey || !secretKey) {
    return err("dLocal Go no está configurado (faltan DLOCALGO_API_KEY / DLOCALGO_SECRET_KEY).");
  }

  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}:${secretKey}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    return err("No pudimos contactar a dLocal Go.");
  }

  const text = await res.text();
  if (!res.ok) {
    return err(`dLocal Go respondió ${res.status}: ${text.slice(0, 300)}`);
  }
  try {
    return ok(text ? (JSON.parse(text) as T) : ({} as T));
  } catch {
    return err("Respuesta de dLocal Go ilegible.");
  }
}

/** `GET /v1/payments/:id` — para atribuir un webhook de cobro. */
export function getPayment(id: string): Promise<Result<DlocalPayment>> {
  return dlocalFetch<DlocalPayment>(`/v1/payments/${encodeURIComponent(id)}`);
}

/** Una página de suscripciones de un plan. */
export function listSubscriptions(
  planId: number,
  page = 1,
  pageSize = 100,
): Promise<Result<Paginated<DlocalSubscription>>> {
  return dlocalFetch<Paginated<DlocalSubscription>>(
    `/v1/subscription/plan/${planId}/subscription/all?page=${page}&page_size=${pageSize}`,
  );
}

/** Ejecuciones (cobros) de una suscripción, más recientes primero según dLocal. */
export function listExecutions(
  planId: number,
  subscriptionId: number,
  page = 1,
  pageSize = 20,
): Promise<Result<Paginated<DlocalExecution>>> {
  return dlocalFetch<Paginated<DlocalExecution>>(
    `/v1/subscription/plan/${planId}/subscription/${subscriptionId}/execution/all?page=${page}&page_size=${pageSize}`,
  );
}

/** Baja de una suscripción en dLocal. El acceso local se mantiene hasta fin de período. */
export function deactivateSubscription(
  planId: number,
  subscriptionId: number,
): Promise<Result<DlocalSubscription>> {
  return dlocalFetch<DlocalSubscription>(
    `/v1/subscription/plan/${planId}/subscription/${subscriptionId}/deactivate`,
    { method: "PATCH" },
  );
}

/** Mueve una suscripción a otro plan (upgrade Freelancer → Teams). dLocal maneja el prorrateo. */
export function changeSubscriberPlan(
  planId: number,
  subscriptionId: number,
  newPlanId: number,
): Promise<Result<DlocalSubscription>> {
  return dlocalFetch<DlocalSubscription>(
    `/v1/subscription/plan/${planId}/subscription/${subscriptionId}/change-plan?new_plan_id=${newPlanId}`,
    { method: "POST" },
  );
}

/** `PATCH /v1/subscription/plan/:id` — solo las URLs (config de entorno, script Phase 8). */
export function patchPlanUrls(
  planId: number,
  urls: { notification_url?: string; success_url?: string; back_url?: string; error_url?: string },
): Promise<Result<DlocalPlanSummary>> {
  return dlocalFetch<DlocalPlanSummary>(`/v1/subscription/plan/${planId}`, {
    method: "PATCH",
    body: JSON.stringify(urls),
  });
}

const planIdCache = new Map<string, number>();

/** El `id` numérico del plan a partir de su `plan_token` (lo que guardamos en env). dLocal
 *  pide el id numérico en los endpoints de suscripción. Cacheado por proceso: el catálogo de
 *  planes de dLocal casi no cambia. */
export async function resolvePlanIdByToken(planToken: string): Promise<Result<number>> {
  const cached = planIdCache.get(planToken);
  if (cached) return ok(cached);

  const listed = await dlocalFetch<Paginated<DlocalPlanSummary>>(
    `/v1/subscription/plan/all?page=1&page_size=100`,
  );
  if (!listed.ok) return listed;

  for (const p of listed.data.data) {
    if (p.plan_token) planIdCache.set(p.plan_token, p.id);
  }
  const found = planIdCache.get(planToken);
  return found ? ok(found) : err(`No se encontró el plan ${planToken} en dLocal Go.`);
}

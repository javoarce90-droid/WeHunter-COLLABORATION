/**
 * Credenciales y endpoints de dLocal Go leídos del entorno (para la API, la verificación de
 * webhooks y el checkout hosteado — Fase 4). `sandbox` por defecto; a producción solo con
 * `DLOCALGO_ENV=live`. Ver `.env.example`.
 *
 * El token de cada plan de suscripción también vive acá (env), no en la tabla `plans`: es un
 * valor distinto por entorno (sandbox ≠ live) y la base de datos es una sola y compartida
 * entre local y producción, así que no puede guardarlo sin pisarse entre entornos.
 */
export function getDlocalConfig() {
  const env = process.env.DLOCALGO_ENV === "live" ? "live" : "sandbox";
  return {
    env,
    apiKey: process.env.DLOCALGO_API_KEY ?? null,
    secretKey: process.env.DLOCALGO_SECRET_KEY ?? null,
    apiBaseUrl:
      env === "live" ? "https://api.dlocalgo.com" : "https://api-sbx.dlocalgo.com",
    checkoutBaseUrl:
      env === "live"
        ? "https://checkout.dlocalgo.com"
        : "https://checkout-sbx.dlocalgo.com",
  } as const;
}

/** Token del plan de suscripción en dLocal Go, por `plans.code` (`DLOCALGO_PLAN_TOKEN_<CODE>`).
 *  null si no está configurado para el entorno actual. */
export function getDlocalPlanToken(planCode: string): string | null {
  return process.env[`DLOCALGO_PLAN_TOKEN_${planCode.toUpperCase()}`] ?? null;
}

/** URL del checkout hosteado de la suscripción para un plan. null si falta el token. */
export function getDlocalSubscribeUrl(planCode: string): string | null {
  const token = getDlocalPlanToken(planCode);
  return token
    ? `${getDlocalConfig().checkoutBaseUrl}/validate/subscription/${token}`
    : null;
}

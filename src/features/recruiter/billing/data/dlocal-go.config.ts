/**
 * Credenciales de dLocal Go leídas del entorno (para la API y la verificación de webhooks —
 * Fase 4). `sandbox` por defecto; a producción solo con `DLOCALGO_ENV=live`. Ver `.env.example`.
 * El token y la URL de checkout de cada plan viven en la tabla `plans`, no acá.
 */
export function getDlocalConfig() {
  const env = process.env.DLOCALGO_ENV === "live" ? "live" : "sandbox";
  return {
    env,
    apiKey: process.env.DLOCALGO_API_KEY ?? null,
    secretKey: process.env.DLOCALGO_SECRET_KEY ?? null,
    apiBaseUrl:
      env === "live" ? "https://api.dlocalgo.com" : "https://api-sbx.dlocalgo.com",
  } as const;
}

/**
 * Configura las URLs (notification / success / back) de los planes de suscripción en dLocal Go.
 * Se corre UNA vez por entorno, cuando cambia el dominio (preview nuevo, producción).
 *
 *   node --env-file-if-exists=.env scripts/dlocal-config-plans.mjs <base-url>
 *   pnpm dlocal:config-plans https://www.we-hunter.com
 *
 * `<base-url>` (o env `DLOCALGO_APP_BASE_URL`): el origen público de la app, sin barra final.
 * Toma el entorno de `DLOCALGO_ENV` (sandbox por defecto) y las credenciales de
 * `DLOCALGO_API_KEY` / `DLOCALGO_SECRET_KEY`.
 */

const base = (process.argv[2] || process.env.DLOCALGO_APP_BASE_URL || "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("Falta la base URL. Uso: node scripts/dlocal-config-plans.mjs https://tu-dominio");
  process.exit(1);
}

const env = process.env.DLOCALGO_ENV === "live" ? "live" : "sandbox";
const apiKey = process.env.DLOCALGO_API_KEY;
const secretKey = process.env.DLOCALGO_SECRET_KEY;
if (!apiKey || !secretKey) {
  console.error("Faltan DLOCALGO_API_KEY / DLOCALGO_SECRET_KEY.");
  process.exit(1);
}

const apiBase = env === "live" ? "https://api.dlocalgo.com" : "https://api-sbx.dlocalgo.com";
const auth = `Bearer ${apiKey}:${secretKey}`;

const urls = {
  notification_url: `${base}/api/webhooks/dlocal`,
  success_url: `${base}/settings/plan/checkout/return`,
  back_url: `${base}/settings/plan?checkout=cancelado`,
};

async function dlocal(path, init) {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { Authorization: auth, "Content-Type": "application/json", ...init?.headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text}`);
  return text ? JSON.parse(text) : {};
}

console.log(`Entorno dLocal Go: ${env}`);
console.log(`Base de la app:    ${base}\n`);

const { data: plans } = await dlocal("/v1/subscription/plan/all?page=1&page_size=100");
if (!plans?.length) {
  console.error("No hay planes en dLocal Go para este entorno.");
  process.exit(1);
}

for (const plan of plans) {
  const updated = await dlocal(`/v1/subscription/plan/${plan.id}`, {
    method: "PATCH",
    body: JSON.stringify(urls),
  });
  console.log(`✓ ${plan.name} (id ${plan.id})`);
  console.log(`    notification_url: ${updated.notification_url}`);
  console.log(`    success_url:      ${updated.success_url}`);
  console.log(`    back_url:         ${updated.back_url}`);
}
console.log("\nListo.");

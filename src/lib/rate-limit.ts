import { headers } from "next/headers";

/**
 * Rate-limit best-effort, en memoria del proceso. NO es una garantía dura: en serverless
 * (Vercel Fluid) hay varias instancias y el contador no se comparte entre ellas, y un
 * reinicio lo resetea. Alcanza para frenar bots simples y ráfagas accidentales en
 * endpoints públicos sin sesión (ej. postulación anónima al Career Site). Para algo más
 * fuerte hace falta un store compartido (Redis) o un captcha.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Consume un intento para `key`. Devuelve false si superó `limit` en la ventana `windowMs`. */
export function consumeRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) return false;

  existing.count += 1;
  return true;
}

/**
 * IP del visitante a partir de los headers del proxy. `x-forwarded-for` puede traer una
 * lista (`client, proxy1, proxy2`) — nos quedamos con el primero. "unknown" si no hay dato:
 * cae en un único bucket compartido, que es el comportamiento seguro (más restrictivo).
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}

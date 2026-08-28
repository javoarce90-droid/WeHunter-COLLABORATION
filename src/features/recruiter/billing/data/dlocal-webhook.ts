import { createHmac, timingSafeEqual } from "node:crypto";
import { getDlocalConfig } from "./dlocal-go.config";

/**
 * Verificación de autenticidad del webhook de dLocal Go. El request trae:
 *   Authorization: V2-HMAC-SHA256, Signature: <hex>
 * donde `<hex> = HMAC_SHA256(apiKey + rawBody, secretKey)` en hexadecimal.
 * `rawBody` es el cuerpo EXACTO recibido (sin re-serializar): la firma es byte a byte.
 */
export function verifyDlocalSignature(
  rawBody: string,
  authHeader: string | null | undefined,
): boolean {
  const { apiKey, secretKey } = getDlocalConfig();
  if (!apiKey || !secretKey || !authHeader) return false;

  const match = authHeader.match(/Signature\s*:\s*([A-Fa-f0-9]+)/);
  if (!match) return false;

  const expected = createHmac("sha256", secretKey)
    .update(apiKey + rawBody)
    .digest("hex");

  const provided = Buffer.from(match[1].toLowerCase(), "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  return (
    provided.length === expectedBuf.length && timingSafeEqual(provided, expectedBuf)
  );
}

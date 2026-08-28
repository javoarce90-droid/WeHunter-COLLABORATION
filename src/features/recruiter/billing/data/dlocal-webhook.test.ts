import { createHmac } from "node:crypto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { verifyDlocalSignature } from "./dlocal-webhook";

const API_KEY = "test_api_key";
const SECRET = "test_secret_key";

const sign = (body: string) =>
  createHmac("sha256", SECRET).update(API_KEY + body).digest("hex");

const header = (body: string) => `V2-HMAC-SHA256, Signature: ${sign(body)}`;

describe("verifyDlocalSignature", () => {
  beforeEach(() => {
    vi.stubEnv("DLOCALGO_API_KEY", API_KEY);
    vi.stubEnv("DLOCALGO_SECRET_KEY", SECRET);
  });
  afterEach(() => vi.unstubAllEnvs());

  const body = '{"payment_id":"DP-283"}';

  it("acepta una firma válida sobre el cuerpo exacto", () => {
    expect(verifyDlocalSignature(body, header(body))).toBe(true);
  });

  it("rechaza si el cuerpo no coincide con la firma", () => {
    expect(verifyDlocalSignature('{"payment_id":"DP-999"}', header(body))).toBe(false);
  });

  it("rechaza una firma con otro secret", () => {
    const bad = `V2-HMAC-SHA256, Signature: ${createHmac("sha256", "otro").update(API_KEY + body).digest("hex")}`;
    expect(verifyDlocalSignature(body, bad)).toBe(false);
  });

  it("rechaza header ausente o sin Signature", () => {
    expect(verifyDlocalSignature(body, null)).toBe(false);
    expect(verifyDlocalSignature(body, "V2-HMAC-SHA256")).toBe(false);
  });

  it("rechaza si faltan las credenciales", () => {
    vi.stubEnv("DLOCALGO_API_KEY", "");
    expect(verifyDlocalSignature(body, header(body))).toBe(false);
  });

  it("tolera espaciado y mayúsculas en el hex del header", () => {
    const h = `V2-HMAC-SHA256, Signature:${sign(body).toUpperCase()}`;
    expect(verifyDlocalSignature(body, h)).toBe(true);
  });
});

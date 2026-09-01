import { describe, expect, it } from "vitest";
import { estimateAiCallCost, priceFamily } from "./pricing";

describe("priceFamily", () => {
  it("mapea aliases y versiones pinneadas", () => {
    expect(priceFamily("gemini-flash-latest")).toBe("flash");
    expect(priceFamily("gemini-2.5-pro")).toBe("pro");
    expect(priceFamily("gemini-flash-lite-latest")).toBe("flash-lite");
  });

  it("flash-lite gana a flash cuando ambos matchean", () => {
    expect(priceFamily("models/gemini-flash-lite-preview")).toBe("flash-lite");
  });

  it("modelo desconocido → null", () => {
    expect(priceFamily("gpt-4o")).toBeNull();
  });
});

describe("estimateAiCallCost", () => {
  it("cuenta thinking tokens como output", () => {
    const cost = estimateAiCallCost("gemini-pro-latest", {
      promptTokenCount: 10_000,
      candidatesTokenCount: 2_000,
      thoughtsTokenCount: 8_000,
      totalTokenCount: 20_000,
    } as never);

    expect(cost.outputTokens).toBe(10_000);
    expect(cost.thoughtTokens).toBe(8_000);
    // 10k input * $1.25/M + 10k output * $10/M = 0.0125 + 0.1 = 0.1125
    expect(cost.usd).toBeCloseTo(0.1125, 6);
  });

  it("descuenta los tokens cacheados del precio de input", () => {
    const full = estimateAiCallCost("gemini-flash-latest", {
      promptTokenCount: 100_000,
      candidatesTokenCount: 1_000,
    } as never);
    const cached = estimateAiCallCost("gemini-flash-latest", {
      promptTokenCount: 100_000,
      cachedContentTokenCount: 90_000,
      candidatesTokenCount: 1_000,
    } as never);

    expect(cached.usd).toBeLessThan(full.usd!);
    // input: 10k no cacheado * $0.30/M + 90k cacheado * $0.075/M = 0.003 + 0.00675
    // output: 1k * $2.50/M = 0.0025  →  total 0.01225
    expect(cached.usd).toBeCloseTo(0.01225, 6);
  });

  it("modelo fuera de tabla → usd null pero tokens igual desglosados", () => {
    const cost = estimateAiCallCost("claude-sonnet-5", {
      promptTokenCount: 500,
      candidatesTokenCount: 200,
    } as never);
    expect(cost.usd).toBeNull();
    expect(cost.promptTokens).toBe(500);
    expect(cost.outputTokens).toBe(200);
  });

  it("usage ausente → todo 0, sin tirar", () => {
    const cost = estimateAiCallCost("gemini-flash-latest", undefined);
    expect(cost).toMatchObject({
      promptTokens: 0,
      outputTokens: 0,
      thoughtTokens: 0,
      totalTokens: 0,
      usd: 0,
    });
  });

  it("tokens de tool-use se cobran como input", () => {
    const cost = estimateAiCallCost("gemini-flash-latest", {
      promptTokenCount: 1_000,
      toolUsePromptTokenCount: 4_000,
      candidatesTokenCount: 500,
    } as never);
    // input: (1000 + 4000) * $0.30/M = 0.0015 ; output: 500 * $2.50/M = 0.00125
    expect(cost.usd).toBeCloseTo(0.00275, 6);
  });
});

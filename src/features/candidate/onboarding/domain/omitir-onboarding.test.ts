import { describe, it, expect, vi } from "vitest";
import { omitirOnboarding } from "./omitir-onboarding";

describe("omitirOnboarding", () => {
  it("rechaza si no hay usuario autenticado", async () => {
    const deps = { markOnboardingComplete: vi.fn() };
    const res = await omitirOnboarding({ userId: null }, deps);
    expect(res.ok).toBe(false);
    expect(deps.markOnboardingComplete).not.toHaveBeenCalled();
  });

  it("marca el onboarding completo para el usuario actual", async () => {
    const deps = { markOnboardingComplete: vi.fn().mockResolvedValue(undefined) };
    const res = await omitirOnboarding({ userId: "candidate-1" }, deps);
    expect(res).toEqual({ ok: true, data: { userId: "candidate-1" } });
    expect(deps.markOnboardingComplete).toHaveBeenCalledWith("candidate-1");
  });
});

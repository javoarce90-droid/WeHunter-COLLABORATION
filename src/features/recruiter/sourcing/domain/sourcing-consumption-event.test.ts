import { describe, it, expect } from "vitest";
import { shouldChargeCredit } from "./sourcing-consumption-event";

describe("shouldChargeCredit", () => {
  it("cobra crédito para NEW_PROFILE", () => {
    expect(shouldChargeCredit("NEW_PROFILE")).toBe(true);
  });

  it("cobra crédito para DUPLICATE — un duplicado del Talent Pool no se exime", () => {
    expect(shouldChargeCredit("DUPLICATE")).toBe(true);
  });

  it("no cobra crédito para REUSED_PROFILE", () => {
    expect(shouldChargeCredit("REUSED_PROFILE")).toBe(false);
  });

  it("no cobra crédito para PROFILE_REFRESH", () => {
    expect(shouldChargeCredit("PROFILE_REFRESH")).toBe(false);
  });

  it("no cobra crédito para FAILED", () => {
    expect(shouldChargeCredit("FAILED")).toBe(false);
  });
});

import { describe, it, expect, afterEach } from "vitest";
import { sourcingCreditsEnabled } from "./sourcing-credits-enabled";

describe("sourcingCreditsEnabled", () => {
  const original = process.env.SOURCING_CREDITS_ENABLED;

  afterEach(() => {
    if (original === undefined) delete process.env.SOURCING_CREDITS_ENABLED;
    else process.env.SOURCING_CREDITS_ENABLED = original;
  });

  it("está habilitado por default (variable sin setear)", () => {
    delete process.env.SOURCING_CREDITS_ENABLED;
    expect(sourcingCreditsEnabled()).toBe(true);
  });

  it("se deshabilita explícitamente con 'false'", () => {
    process.env.SOURCING_CREDITS_ENABLED = "false";
    expect(sourcingCreditsEnabled()).toBe(false);
  });

  it("cualquier otro valor lo deja habilitado", () => {
    process.env.SOURCING_CREDITS_ENABLED = "true";
    expect(sourcingCreditsEnabled()).toBe(true);
  });
});

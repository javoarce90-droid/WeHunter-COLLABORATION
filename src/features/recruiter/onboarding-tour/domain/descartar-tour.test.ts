import { describe, it, expect, vi } from "vitest";
import { descartarTour, type DescartarTourDeps } from "./descartar-tour";

function makeDeps(): DescartarTourDeps {
  return {
    dismissOnboardingTour: vi.fn(async () => undefined),
  };
}

describe("descartarTour", () => {
  it("rechaza sin usuario autenticado", async () => {
    const deps = makeDeps();
    const res = await descartarTour({ userId: null, organizationId: "org-1" }, deps);

    expect(res.ok).toBe(false);
    expect(deps.dismissOnboardingTour).not.toHaveBeenCalled();
  });

  it("rechaza sin organization activa", async () => {
    const deps = makeDeps();
    const res = await descartarTour({ userId: "user-1", organizationId: null }, deps);

    expect(res.ok).toBe(false);
    expect(deps.dismissOnboardingTour).not.toHaveBeenCalled();
  });

  it("marca el tour como descartado para el membership del usuario", async () => {
    const deps = makeDeps();
    const res = await descartarTour({ userId: "user-1", organizationId: "org-1" }, deps);

    expect(res.ok).toBe(true);
    expect(deps.dismissOnboardingTour).toHaveBeenCalledWith("user-1", "org-1");
  });
});

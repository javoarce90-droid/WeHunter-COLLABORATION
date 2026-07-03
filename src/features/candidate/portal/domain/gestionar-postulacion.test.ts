import { describe, it, expect, vi } from "vitest";
import { retirarPostulacion, toStepperStage } from "./gestionar-postulacion";

describe("retirarPostulacion", () => {
  it("rechaza si no hay usuario autenticado", async () => {
    const deps = { withdraw: vi.fn() };
    const res = await retirarPostulacion("app-1", { userId: null }, deps);
    expect(res.ok).toBe(false);
    expect(deps.withdraw).not.toHaveBeenCalled();
  });

  it("rechaza si el applicationId está vacío", async () => {
    const deps = { withdraw: vi.fn() };
    const res = await retirarPostulacion("  ", { userId: "candidate-1" }, deps);
    expect(res.ok).toBe(false);
    expect(deps.withdraw).not.toHaveBeenCalled();
  });

  it("retira la postulación llamando a deps.withdraw", async () => {
    const deps = { withdraw: vi.fn().mockResolvedValue(undefined) };
    const res = await retirarPostulacion("app-1", { userId: "candidate-1" }, deps);
    expect(res).toEqual({ ok: true, data: { applicationId: "app-1" } });
    expect(deps.withdraw).toHaveBeenCalledWith("app-1");
  });
});

describe("toStepperStage", () => {
  it("mapea las tres sub-etapas de entrevista al mismo paso visual", () => {
    expect(toStepperStage("interview_hr")).toBe("interview");
    expect(toStepperStage("interview_tech")).toBe("interview");
    expect(toStepperStage("interview_client")).toBe("interview");
  });

  it("deja el resto de las etapas sin cambios", () => {
    expect(toStepperStage("new")).toBe("new");
    expect(toStepperStage("hired")).toBe("hired");
    expect(toStepperStage("rejected")).toBe("rejected");
  });
});

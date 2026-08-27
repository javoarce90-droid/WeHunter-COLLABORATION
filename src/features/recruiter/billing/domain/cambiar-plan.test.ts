import { describe, it, expect, vi } from "vitest";
import { cambiarPlan, type CambiarPlanDeps } from "./cambiar-plan";
import type { Plan } from "@/db/schema";

const plan = (over: Partial<Plan>): Plan =>
  ({
    id: "p",
    code: "freelancer",
    name: "Freelancer",
    workspaceType: "freelance",
    price: "29.99",
    currency: "USD",
    trialDays: 14,
    maxMembers: 1,
    dlocalPlanToken: null,
    dlocalSubscribeUrl: null,
    active: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as Plan;

const FREELANCER = plan({ id: "free", code: "freelancer", workspaceType: "freelance", sortOrder: 1 });
const TEAMS = plan({ id: "team", code: "teams", name: "Teams", workspaceType: "team", sortOrder: 2, price: "99.99" });

const deps = (over: Partial<CambiarPlanDeps> = {}): CambiarPlanDeps => ({
  getActivePlans: vi.fn(async () => [FREELANCER, TEAMS]),
  applyPlanChange: vi.fn(async () => {}),
  ...over,
});

const ctx = { organizationId: "org-1", role: "owner" as const, currentPlanId: "free" };

describe("cambiarPlan", () => {
  it("rechaza a un rol sin billing.view", async () => {
    const d = deps();
    const res = await cambiarPlan({ targetPlanCode: "teams" }, { ...ctx, role: "recruiter" }, d);
    expect(res.ok).toBe(false);
    expect(d.applyPlanChange).not.toHaveBeenCalled();
  });

  it("upgrade Freelancer → Teams aplica el cambio", async () => {
    const d = deps();
    const res = await cambiarPlan({ targetPlanCode: "teams" }, ctx, d);
    expect(res.ok).toBe(true);
    expect(d.applyPlanChange).toHaveBeenCalledWith({
      organizationId: "org-1",
      targetPlanId: "team",
      targetWorkspaceType: "team",
    });
  });

  it("upgrade aunque el workspace_type ya sea team pero la suscripción esté en Freelancer", async () => {
    // Estado inconsistente real: lo resuelve el upgrade alineando ambos.
    const d = deps();
    const res = await cambiarPlan({ targetPlanCode: "teams" }, { ...ctx, currentPlanId: "free" }, d);
    expect(res.ok).toBe(true);
    expect(d.applyPlanChange).toHaveBeenCalled();
  });

  it("rechaza el downgrade Teams → Freelancer", async () => {
    const d = deps();
    const res = await cambiarPlan(
      { targetPlanCode: "freelancer" },
      { ...ctx, currentPlanId: "team" },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.applyPlanChange).not.toHaveBeenCalled();
  });

  it("rechaza quedarse en el mismo plan", async () => {
    const res = await cambiarPlan({ targetPlanCode: "freelancer" }, ctx, deps());
    expect(res.ok).toBe(false);
  });

  it("rechaza un plan inexistente", async () => {
    const res = await cambiarPlan({ targetPlanCode: "enterprise" }, ctx, deps());
    expect(res.ok).toBe(false);
  });
});

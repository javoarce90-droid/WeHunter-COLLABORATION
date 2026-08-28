import { describe, it, expect, vi } from "vitest";
import { iniciarSuscripcion, type IniciarSuscripcionDeps } from "./iniciar-suscripcion";

const deps = (over: Partial<IniciarSuscripcionDeps> = {}): IniciarSuscripcionDeps => ({
  plan: { id: "plan-1" },
  subscribeUrl: "https://checkout-sbx.dlocalgo.com/validate/subscription/abc123",
  ensurePendingSubscription: vi.fn(async () => {}),
  ...over,
});

const ctx = {
  organizationId: "org-1",
  role: "owner" as const,
  userEmail: "dueño@estudio.com",
};

describe("iniciarSuscripcion", () => {
  it("rechaza a un rol sin billing.view y no registra nada", async () => {
    const d = deps();
    const res = await iniciarSuscripcion({ ...ctx, role: "recruiter" }, d);
    expect(res.ok).toBe(false);
    expect(d.ensurePendingSubscription).not.toHaveBeenCalled();
  });

  it("falla claro si el plan no tiene checkout de dLocal configurado", async () => {
    const d = deps({ subscribeUrl: null });
    const res = await iniciarSuscripcion(ctx, d);
    expect(res.ok).toBe(false);
    expect(d.ensurePendingSubscription).not.toHaveBeenCalled();
  });

  it("falla si no hay plan (enterprise/legado)", async () => {
    const res = await iniciarSuscripcion(ctx, deps({ plan: null }));
    expect(res.ok).toBe(false);
  });

  it("deja la suscripción en pending y arma la URL con external_id + email", async () => {
    const d = deps();
    const res = await iniciarSuscripcion(ctx, d);
    expect(res.ok).toBe(true);
    expect(d.ensurePendingSubscription).toHaveBeenCalledWith({
      organizationId: "org-1",
      planId: "plan-1",
    });
    if (!res.ok) return;
    const url = new URL(res.data.checkoutUrl);
    expect(url.searchParams.get("external_id")).toBe("org-1");
    expect(url.searchParams.get("email")).toBe("dueño@estudio.com");
  });

  it("omite el email si no hay usuario con email", async () => {
    const res = await iniciarSuscripcion({ ...ctx, userEmail: null }, deps());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(new URL(res.data.checkoutUrl).searchParams.has("email")).toBe(false);
  });
});

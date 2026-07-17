import { describe, it, expect, vi } from "vitest";
import { revocarClientShare } from "./revocar-client-share";
import type { RevocarClientShareCtx, RevocarClientShareDeps } from "./revocar-client-share";

const makeDeps = (overrides?: Partial<RevocarClientShareDeps>): RevocarClientShareDeps => ({
  getClientShareById: vi.fn().mockResolvedValue({ id: "share-1", revokedAt: null }),
  revokeClientShare: vi.fn().mockResolvedValue({ revoked: true }),
  ...overrides,
});

const ctx: RevocarClientShareCtx = { organizationId: "org-1", role: "recruiter" };
const input = { shareId: "share-1" };

describe("revocarClientShare", () => {
  it("revoca un enlace activo", async () => {
    const deps = makeDeps();
    const result = await revocarClientShare(input, ctx, deps);
    expect(result.ok).toBe(true);
    expect(deps.revokeClientShare).toHaveBeenCalledWith("share-1");
  });

  it("rechaza un enlace ya revocado", async () => {
    const deps = makeDeps({
      getClientShareById: vi.fn().mockResolvedValue({ id: "share-1", revokedAt: new Date() }),
    });
    const result = await revocarClientShare(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/ya estaba revocado/i);
    expect(deps.revokeClientShare).not.toHaveBeenCalled();
  });

  it("no revoca un enlace de otra organización", async () => {
    const deps = makeDeps({ getClientShareById: vi.fn().mockResolvedValue(null) });
    const result = await revocarClientShare(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrado/i);
    expect(deps.revokeClientShare).not.toHaveBeenCalled();
  });

  it("rechaza al consultor", async () => {
    const deps = makeDeps();
    const result = await revocarClientShare(input, { ...ctx, role: "consultant" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/permisos/i);
    expect(deps.revokeClientShare).not.toHaveBeenCalled();
  });
});

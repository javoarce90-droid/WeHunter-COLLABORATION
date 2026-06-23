import { describe, it, expect, vi } from "vitest";
import { revocarShare } from "./revocar-share";
import type { RevocarShareDeps, RevocarShareContext } from "./revocar-share";

const makeDeps = (overrides?: Partial<RevocarShareDeps>): RevocarShareDeps => ({
  getShareById: vi.fn().mockResolvedValue({ id: "share-1", revokedAt: null }),
  revokeShare: vi.fn().mockResolvedValue({ revoked: true }),
  ...overrides,
});

const ctx: RevocarShareContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

describe("revocarShare", () => {
  it("revoca un enlace activo", async () => {
    const deps = makeDeps();
    const result = await revocarShare({ shareId: "share-1" }, ctx, deps);
    expect(result.ok).toBe(true);
    expect(deps.revokeShare).toHaveBeenCalledWith("share-1");
  });

  it("rechaza si el enlace no existe en la org", async () => {
    const deps = makeDeps({ getShareById: vi.fn().mockResolvedValue(null) });
    const result = await revocarShare({ shareId: "share-1" }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrado/i);
  });

  it("rechaza si el enlace ya estaba revocado", async () => {
    const deps = makeDeps({
      getShareById: vi.fn().mockResolvedValue({ id: "share-1", revokedAt: new Date() }),
    });
    const result = await revocarShare({ shareId: "share-1" }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/ya estaba revocado/i);
    expect(deps.revokeShare).not.toHaveBeenCalled();
  });

  it("rechaza si el rol es consultant", async () => {
    const deps = makeDeps();
    const result = await revocarShare({ shareId: "share-1" }, { ...ctx, role: "consultant" }, deps);
    expect(result.ok).toBe(false);
  });
});

import { describe, it, expect, vi } from "vitest";
import { compartirConHM } from "./compartir-con-hm";
import type { CompartirConHMCtx, CompartirConHMDeps } from "./compartir-con-hm";

const makeDeps = (overrides?: Partial<CompartirConHMDeps>): CompartirConHMDeps => ({
  getShortlistById: vi.fn().mockResolvedValue({ id: "sl-1" }),
  getMembership: vi.fn().mockResolvedValue({ id: "mem-hm", role: "hiring_manager", status: "active" }),
  generateToken: vi.fn().mockReturnValue("tok_abc123"),
  createShareForMembership: vi.fn().mockResolvedValue({ shareId: "share-1" }),
  ...overrides,
});

const ctx: CompartirConHMCtx = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

const input = { shortlistId: "sl-1", membershipId: "mem-hm" };

describe("compartirConHM", () => {
  it("comparte el shortlist con el Hiring Manager elegido", async () => {
    const deps = makeDeps();
    const result = await compartirConHM(input, ctx, deps);
    expect(result.ok).toBe(true);
    expect(deps.createShareForMembership).toHaveBeenCalledWith(
      expect.objectContaining({ shortlistId: "sl-1", sharedWithMembershipId: "mem-hm", token: "tok_abc123" }),
    );
  });

  it("rechaza si el shortlist no existe en la org", async () => {
    const deps = makeDeps({ getShortlistById: vi.fn().mockResolvedValue(null) });
    const result = await compartirConHM(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrado/i);
    expect(deps.createShareForMembership).not.toHaveBeenCalled();
  });

  it("rechaza un miembro que no existe", async () => {
    const deps = makeDeps({ getMembership: vi.fn().mockResolvedValue(null) });
    const result = await compartirConHM(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no existe/i);
    expect(deps.createShareForMembership).not.toHaveBeenCalled();
  });

  it("rechaza un HM inactivo", async () => {
    const deps = makeDeps({
      getMembership: vi.fn().mockResolvedValue({ id: "mem-hm", role: "hiring_manager", status: "inactive" }),
    });
    const result = await compartirConHM(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/inactivo/i);
    expect(deps.createShareForMembership).not.toHaveBeenCalled();
  });

  it("rechaza compartir con alguien que no es Hiring Manager", async () => {
    const deps = makeDeps({
      getMembership: vi.fn().mockResolvedValue({ id: "mem-x", role: "recruiter", status: "active" }),
    });
    const result = await compartirConHM(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Hiring Manager/i);
    expect(deps.createShareForMembership).not.toHaveBeenCalled();
  });

  it("rechaza si el rol actor es consultant", async () => {
    const deps = makeDeps();
    const result = await compartirConHM(input, { ...ctx, role: "consultant" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(deps.createShareForMembership).not.toHaveBeenCalled();
  });
});

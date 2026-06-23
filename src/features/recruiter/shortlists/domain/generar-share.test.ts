import { describe, it, expect, vi } from "vitest";
import { generarShare } from "./generar-share";
import type { GenerarShareDeps, GenerarShareContext } from "./generar-share";

const makeDeps = (overrides?: Partial<GenerarShareDeps>): GenerarShareDeps => ({
  getShortlistById: vi.fn().mockResolvedValue({ id: "sl-1" }),
  generateToken: vi.fn().mockReturnValue("tok_abc123"),
  createShare: vi
    .fn()
    .mockImplementation((d) => Promise.resolve({ shareId: "share-1", token: d.token })),
  ...overrides,
});

const ctx: GenerarShareContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

describe("generarShare", () => {
  it("genera un share con token y sin vencimiento", async () => {
    const deps = makeDeps();
    const result = await generarShare({ shortlistId: "sl-1", expiresInDays: null }, ctx, deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.token).toBe("tok_abc123");
    expect(deps.createShare).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt: null, token: "tok_abc123" }),
    );
  });

  it("calcula expiresAt a futuro cuando hay expiresInDays", async () => {
    const deps = makeDeps();
    const before = Date.now();
    const result = await generarShare({ shortlistId: "sl-1", expiresInDays: 7 }, ctx, deps);

    expect(result.ok).toBe(true);
    const call = (deps.createShare as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const expiresAt: Date = call.expiresAt;
    expect(expiresAt).toBeInstanceOf(Date);
    // ~7 días en el futuro
    const diffDays = (expiresAt.getTime() - before) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThan(6.9);
    expect(diffDays).toBeLessThan(7.1);
  });

  it("rechaza expiresInDays <= 0", async () => {
    const deps = makeDeps();
    const result = await generarShare({ shortlistId: "sl-1", expiresInDays: 0 }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/al menos un día/i);
  });

  it("rechaza si el shortlist no existe en la org", async () => {
    const deps = makeDeps({ getShortlistById: vi.fn().mockResolvedValue(null) });
    const result = await generarShare({ shortlistId: "sl-1", expiresInDays: null }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrado/i);
  });

  it("rechaza si el rol es consultant", async () => {
    const deps = makeDeps();
    const result = await generarShare(
      { shortlistId: "sl-1", expiresInDays: null },
      { ...ctx, role: "consultant" },
      deps,
    );
    expect(result.ok).toBe(false);
  });
});

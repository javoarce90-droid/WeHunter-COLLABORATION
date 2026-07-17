import { describe, it, expect, vi } from "vitest";
import { generarClientShare } from "./generar-client-share";
import type { GenerarClientShareCtx, GenerarClientShareDeps } from "./generar-client-share";

const makeDeps = (overrides?: Partial<GenerarClientShareDeps>): GenerarClientShareDeps => ({
  getClientById: vi.fn().mockResolvedValue({ id: "cli-1" }),
  generateToken: vi.fn().mockReturnValue("tok_generado"),
  createClientShare: vi
    .fn()
    .mockImplementation(async (args) => ({ shareId: "share-1", token: args.token })),
  ...overrides,
});

const ctx: GenerarClientShareCtx = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

const input = { clientId: "cli-1", expiresInDays: 7 };

describe("generarClientShare", () => {
  it("genera el enlace con vencimiento", async () => {
    const deps = makeDeps();
    const result = await generarClientShare(input, ctx, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.token).toBe("tok_generado");
    const args = vi.mocked(deps.createClientShare).mock.calls[0]![0];
    expect(args.organizationId).toBe("org-1");
    expect(args.clientId).toBe("cli-1");
    expect(args.expiresAt).toBeInstanceOf(Date);
  });

  it("acepta enlace sin vencimiento", async () => {
    const deps = makeDeps();
    const result = await generarClientShare({ ...input, expiresInDays: null }, ctx, deps);
    expect(result.ok).toBe(true);
    expect(vi.mocked(deps.createClientShare).mock.calls[0]![0].expiresAt).toBeNull();
  });

  it("rechaza un vencimiento de cero o negativo", async () => {
    const deps = makeDeps();
    const result = await generarClientShare({ ...input, expiresInDays: 0 }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/al menos un día/i);
    expect(deps.createClientShare).not.toHaveBeenCalled();
  });

  it("rechaza al consultor", async () => {
    const deps = makeDeps();
    const result = await generarClientShare(input, { ...ctx, role: "consultant" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/permisos/i);
    expect(deps.createClientShare).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión activa", async () => {
    const deps = makeDeps();
    const result = await generarClientShare(input, { ...ctx, organizationId: null }, deps);
    expect(result.ok).toBe(false);
    expect(deps.createClientShare).not.toHaveBeenCalled();
  });

  it("no genera enlace para un cliente de otra organización", async () => {
    const deps = makeDeps({ getClientById: vi.fn().mockResolvedValue(null) });
    const result = await generarClientShare(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrado/i);
    expect(deps.createClientShare).not.toHaveBeenCalled();
  });
});

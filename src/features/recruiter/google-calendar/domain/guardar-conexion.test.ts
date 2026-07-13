import { describe, it, expect, vi } from "vitest";
import { guardarConexion } from "./guardar-conexion";
import type { GuardarConexionDeps, GuardarConexionInput } from "./guardar-conexion";

const input: GuardarConexionInput = {
  organizationId: "org-1",
  profileId: "user-1",
  googleEmail: "recruiter@gmail.com",
  accessToken: "access-1",
  refreshToken: "refresh-1",
  expiresAt: new Date(Date.now() + 3600_000),
};

const makeDeps = (overrides?: Partial<GuardarConexionDeps>): GuardarConexionDeps => ({
  upsertConnection: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("guardarConexion", () => {
  it("guarda la conexión con tokens y email válidos", async () => {
    const deps = makeDeps();
    const result = await guardarConexion(input, deps);
    expect(result.ok).toBe(true);
    expect(deps.upsertConnection).toHaveBeenCalledWith(input);
  });

  it("rechaza si falta el access token", async () => {
    const deps = makeDeps();
    const result = await guardarConexion({ ...input, accessToken: "" }, deps);
    expect(result.ok).toBe(false);
    expect(deps.upsertConnection).not.toHaveBeenCalled();
  });

  it("rechaza si falta el refresh token", async () => {
    const deps = makeDeps();
    const result = await guardarConexion({ ...input, refreshToken: "" }, deps);
    expect(result.ok).toBe(false);
    expect(deps.upsertConnection).not.toHaveBeenCalled();
  });

  it("rechaza si falta el email de Google", async () => {
    const deps = makeDeps();
    const result = await guardarConexion({ ...input, googleEmail: "" }, deps);
    expect(result.ok).toBe(false);
    expect(deps.upsertConnection).not.toHaveBeenCalled();
  });
});

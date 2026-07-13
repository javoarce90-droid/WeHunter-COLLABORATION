import { describe, it, expect, vi } from "vitest";
import { desconectarIntegracion } from "./desconectar-integracion";
import type { DesconectarIntegracionDeps } from "./desconectar-integracion";

const makeDeps = (): DesconectarIntegracionDeps => ({
  deleteConnection: vi.fn().mockResolvedValue(undefined),
});

describe("desconectarIntegracion", () => {
  it("desconecta la integración del usuario actual", async () => {
    const deps = makeDeps();
    const result = await desconectarIntegracion(
      { userId: "user-1", organizationId: "org-1" },
      deps,
    );
    expect(result.ok).toBe(true);
    expect(deps.deleteConnection).toHaveBeenCalledWith("user-1", "org-1");
  });

  it("rechaza sin usuario autenticado", async () => {
    const deps = makeDeps();
    const result = await desconectarIntegracion(
      { userId: null, organizationId: "org-1" },
      deps,
    );
    expect(result.ok).toBe(false);
    expect(deps.deleteConnection).not.toHaveBeenCalled();
  });

  it("rechaza sin organization activa", async () => {
    const deps = makeDeps();
    const result = await desconectarIntegracion(
      { userId: "user-1", organizationId: null },
      deps,
    );
    expect(result.ok).toBe(false);
    expect(deps.deleteConnection).not.toHaveBeenCalled();
  });
});

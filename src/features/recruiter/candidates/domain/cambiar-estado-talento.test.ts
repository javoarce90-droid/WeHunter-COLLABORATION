import { describe, it, expect, vi } from "vitest";
import { cambiarEstadoTalento } from "./cambiar-estado-talento";
import type { CambiarEstadoTalentoDeps } from "./cambiar-estado-talento";

const ctx = { organizationId: "org-1", role: "recruiter" as const };

const makeDeps = (over?: Partial<CambiarEstadoTalentoDeps>): CambiarEstadoTalentoDeps => ({
  getCandidate: vi.fn().mockResolvedValue({ id: "c-1" }),
  setState: vi.fn().mockResolvedValue(undefined),
  ...over,
});

describe("cambiarEstadoTalento", () => {
  it("archiva un candidato existente", async () => {
    const deps = makeDeps();
    const res = await cambiarEstadoTalento(
      { candidateId: "c-1", talentState: "archived" },
      ctx,
      deps,
    );
    expect(res.ok).toBe(true);
    expect(deps.setState).toHaveBeenCalledWith("c-1", "archived");
  });

  it("rechaza si el candidato no existe", async () => {
    const deps = makeDeps({ getCandidate: vi.fn().mockResolvedValue(null) });
    const res = await cambiarEstadoTalento(
      { candidateId: "x", talentState: "passive" },
      ctx,
      deps,
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/no encontrado/i);
    expect(deps.setState).not.toHaveBeenCalled();
  });

  it("rechaza al consultor", async () => {
    const deps = makeDeps();
    const res = await cambiarEstadoTalento(
      { candidateId: "c-1", talentState: "archived" },
      { ...ctx, role: "consultant" },
      deps,
    );
    expect(res.ok).toBe(false);
    expect(deps.setState).not.toHaveBeenCalled();
  });
});

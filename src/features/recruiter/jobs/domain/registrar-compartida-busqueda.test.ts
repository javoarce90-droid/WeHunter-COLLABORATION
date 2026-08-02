import { describe, it, expect, vi } from "vitest";
import {
  registrarCompartidaBusqueda,
  type RegistrarCompartidaBusquedaDeps,
} from "./registrar-compartida-busqueda";

function deps(): RegistrarCompartidaBusquedaDeps {
  return { incrementShareCount: vi.fn(async () => {}) };
}
const ctx = { organizationId: "org-1", role: "recruiter" as const };

describe("registrarCompartidaBusqueda", () => {
  it("incrementa el contador de compartidas", async () => {
    const d = deps();
    const res = await registrarCompartidaBusqueda({ jobId: "job-1" }, ctx, d);

    expect(res.ok).toBe(true);
    expect(d.incrementShareCount).toHaveBeenCalledWith("job-1", "org-1");
  });

  it("un rol sin permiso no registra la compartida", async () => {
    const d = deps();
    const res = await registrarCompartidaBusqueda(
      { jobId: "job-1" },
      { organizationId: "org-1", role: "sourcer" },
      d,
    );

    expect(res).toMatchObject({ ok: false });
    expect(d.incrementShareCount).not.toHaveBeenCalled();
  });

  it("sin sesión activa no registra la compartida", async () => {
    const d = deps();
    const res = await registrarCompartidaBusqueda(
      { jobId: "job-1" },
      { organizationId: null, role: null },
      d,
    );

    expect(res).toMatchObject({ ok: false });
    expect(d.incrementShareCount).not.toHaveBeenCalled();
  });
});

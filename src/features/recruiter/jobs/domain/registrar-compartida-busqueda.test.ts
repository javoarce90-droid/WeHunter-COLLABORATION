import { describe, it, expect, vi } from "vitest";
import {
  registrarCompartidaBusqueda,
  type RegistrarCompartidaBusquedaDeps,
} from "./registrar-compartida-busqueda";

function deps(): RegistrarCompartidaBusquedaDeps {
  return { incrementShareCount: vi.fn(async () => {}) };
}
const ctx = { organizationId: "org-1", role: "recruiter" as const, membershipId: "m1" };

describe("registrarCompartidaBusqueda", () => {
  it("incrementa el contador de compartidas", async () => {
    const d = deps();
    const res = await registrarCompartidaBusqueda({ jobId: "job-1" }, ctx, d);

    expect(res.ok).toBe(true);
    // Recruiter queda acotado a lo asignado: se lo pasa a incrementShareCount.
    expect(d.incrementShareCount).toHaveBeenCalledWith("job-1", "org-1", "m1");
  });

  it("owner/admin no quedan acotados a una búsqueda asignada (sin scope)", async () => {
    const d = deps();
    await registrarCompartidaBusqueda({ jobId: "job-1" }, { ...ctx, role: "owner" }, d);
    expect(d.incrementShareCount).toHaveBeenCalledWith("job-1", "org-1", undefined);
  });

  it("un rol sin permiso no registra la compartida", async () => {
    const d = deps();
    const res = await registrarCompartidaBusqueda(
      { jobId: "job-1" },
      { organizationId: "org-1", role: "sourcer", membershipId: "m1" },
      d,
    );

    expect(res).toMatchObject({ ok: false });
    expect(d.incrementShareCount).not.toHaveBeenCalled();
  });

  it("sin sesión activa no registra la compartida", async () => {
    const d = deps();
    const res = await registrarCompartidaBusqueda(
      { jobId: "job-1" },
      { organizationId: null, role: null, membershipId: null },
      d,
    );

    expect(res).toMatchObject({ ok: false });
    expect(d.incrementShareCount).not.toHaveBeenCalled();
  });
});

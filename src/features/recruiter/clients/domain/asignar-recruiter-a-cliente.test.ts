import { describe, it, expect, vi } from "vitest";
import {
  asignarRecruiterACliente,
  type AsignarRecruiterAClienteDeps,
} from "./asignar-recruiter-a-cliente";

function deps(over: Partial<AsignarRecruiterAClienteDeps> = {}): AsignarRecruiterAClienteDeps {
  return {
    getClientById: vi.fn(async () => ({ id: "client-1" })),
    getMembershipById: vi.fn(async () => ({ id: "member-1" })),
    assignRecruiterToClient: vi.fn(async () => {}),
    ...over,
  };
}
const ctx = { organizationId: "org-1", role: "admin" as const };

describe("asignarRecruiterACliente", () => {
  it("asigna un recruiter al cliente", async () => {
    const d = deps();
    const res = await asignarRecruiterACliente(
      { clientId: "client-1", membershipId: "member-1" },
      ctx,
      d,
    );

    expect(res.ok).toBe(true);
    expect(d.assignRecruiterToClient).toHaveBeenCalledWith("org-1", "client-1", "member-1");
  });

  it("desasigna con membershipId null", async () => {
    const d = deps();
    const res = await asignarRecruiterACliente({ clientId: "client-1", membershipId: null }, ctx, d);

    expect(res.ok).toBe(true);
    expect(d.assignRecruiterToClient).toHaveBeenCalledWith("org-1", "client-1", null);
  });

  it("cliente no encontrado", async () => {
    const d = deps({ getClientById: vi.fn(async () => null) });
    const res = await asignarRecruiterACliente(
      { clientId: "client-x", membershipId: "member-1" },
      ctx,
      d,
    );

    expect(res).toMatchObject({ ok: false });
    expect(d.assignRecruiterToClient).not.toHaveBeenCalled();
  });

  it("el membership no pertenece al workspace", async () => {
    const d = deps({ getMembershipById: vi.fn(async () => null) });
    const res = await asignarRecruiterACliente(
      { clientId: "client-1", membershipId: "member-x" },
      ctx,
      d,
    );

    expect(res).toMatchObject({ ok: false });
    expect(d.assignRecruiterToClient).not.toHaveBeenCalled();
  });

  it("un rol sin permiso no asigna", async () => {
    const d = deps();
    const res = await asignarRecruiterACliente(
      { clientId: "client-1", membershipId: "member-1" },
      { organizationId: "org-1", role: "hiring_manager" },
      d,
    );

    expect(res).toMatchObject({ ok: false });
    expect(d.getClientById).not.toHaveBeenCalled();
  });
});

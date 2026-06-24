import { describe, it, expect, vi } from "vitest";
import { editarCliente, type EditarClienteDeps } from "./editar-cliente";

const deps = (updated = true): EditarClienteDeps => ({
  updateClientFields: vi.fn(async () => ({ updated })),
});
const ctx = { organizationId: "org-1", role: "recruiter" as const };

describe("editarCliente", () => {
  it("rechaza sin organization/rol", async () => {
    const d = deps();
    const res = await editarCliente(
      { clientId: "c1", name: "Acme" },
      { organizationId: null, role: null },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.updateClientFields).not.toHaveBeenCalled();
  });

  it("rechaza al consultor", async () => {
    const d = deps();
    const res = await editarCliente(
      { clientId: "c1", name: "Acme" },
      { ...ctx, role: "consultant" },
      d,
    );
    expect(res.ok).toBe(false);
  });

  it("error si el cliente no existe", async () => {
    const d = deps(false);
    const res = await editarCliente({ clientId: "c1", name: "Acme" }, ctx, d);
    expect(res.ok).toBe(false);
  });

  it("edita normalizando campos", async () => {
    const d = deps();
    const res = await editarCliente(
      { clientId: "c1", name: "  Acme  ", contactName: "", contactEmail: "a@b.com", notes: "x" },
      ctx,
      d,
    );
    expect(res).toEqual({ ok: true, data: { clientId: "c1" } });
    expect(d.updateClientFields).toHaveBeenCalledWith("c1", "org-1", {
      name: "Acme",
      contactName: null,
      contactEmail: "a@b.com",
      notes: "x",
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import { crearCliente, type CrearClienteDeps } from "./crear-cliente";

const deps = (clientId = "client-1"): CrearClienteDeps => ({
  insertClient: vi.fn(async () => ({ clientId })),
});
const ctx = { userId: "u1", organizationId: "org-1", role: "recruiter" as const };

describe("crearCliente", () => {
  it("rechaza sin sesión/organization", async () => {
    const d = deps();
    const res = await crearCliente(
      { name: "Acme" },
      { userId: null, organizationId: null, role: null },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.insertClient).not.toHaveBeenCalled();
  });

  it("rechaza al consultor", async () => {
    const d = deps();
    const res = await crearCliente({ name: "Acme" }, { ...ctx, role: "consultant" }, d);
    expect(res.ok).toBe(false);
    expect(d.insertClient).not.toHaveBeenCalled();
  });

  it("rechaza nombre demasiado corto", async () => {
    const d = deps();
    const res = await crearCliente({ name: "A" }, ctx, d);
    expect(res.ok).toBe(false);
  });

  it("crea normalizando campos y opcionales vacíos como null", async () => {
    const d = deps("client-9");
    const res = await crearCliente(
      { name: "  Acme Corp  ", contactName: "  Ana  ", contactEmail: "", notes: "   " },
      ctx,
      d,
    );
    expect(res).toEqual({ ok: true, data: { clientId: "client-9" } });
    expect(d.insertClient).toHaveBeenCalledWith({
      organizationId: "org-1",
      name: "Acme Corp",
      contactName: "Ana",
      contactEmail: null,
      notes: null,
      createdBy: "u1",
    });
  });
});

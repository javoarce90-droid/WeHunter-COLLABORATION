import { describe, it, expect, vi } from "vitest";
import { crearCliente, type CrearClienteDeps } from "./crear-cliente";
import type { OrgRole } from "@/lib/auth/session";

type MembershipRow = { id: string; role: OrgRole; status: string } | null;

const deps = (over: {
  clientId?: string;
  soleMembershipId?: string | null;
  member?: MembershipRow;
} = {}): CrearClienteDeps => ({
  insertClient: vi.fn(async () => ({ clientId: over.clientId ?? "client-1" })),
  getSoleActiveMembershipId: vi.fn(async () => over.soleMembershipId ?? null),
  assignRecruiterToClient: vi.fn(async () => {}),
  getMembershipById: vi.fn(async () => over.member ?? null),
  generateShareToken: vi.fn(() => "tok_abc"),
  createClientShare: vi.fn(async () => ({ shareId: "share-1", token: "tok_abc" })),
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
    const d = deps({ clientId: "client-9" });
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
    expect(d.assignRecruiterToClient).not.toHaveBeenCalled();
  });

  it("auto-asigna al único miembro activo de la org como recruiter (sin elegir a mano)", async () => {
    const d = deps({ clientId: "client-9", soleMembershipId: "membership-1" });
    await crearCliente({ name: "Acme Corp" }, ctx, d);
    expect(d.assignRecruiterToClient).toHaveBeenCalledWith("org-1", "client-9", "membership-1");
  });

  it("asigna el responsable elegido a mano (owner/admin/recruiter) en vez del fallback solo-un-miembro", async () => {
    const d = deps({
      clientId: "client-9",
      soleMembershipId: "membership-1",
      member: { id: "membership-2", role: "admin", status: "active" },
    });
    await crearCliente({ name: "Acme Corp", assignedMembershipId: "membership-2" }, ctx, d);
    expect(d.assignRecruiterToClient).toHaveBeenCalledWith("org-1", "client-9", "membership-2");
    expect(d.assignRecruiterToClient).toHaveBeenCalledTimes(1);
    expect(d.getSoleActiveMembershipId).not.toHaveBeenCalled();
  });

  it("ignora en silencio un responsable elegido con rol que no califica (sourcer)", async () => {
    const d = deps({
      member: { id: "membership-2", role: "sourcer", status: "active" },
    });
    const res = await crearCliente({ name: "Acme Corp", assignedMembershipId: "membership-2" }, ctx, d);
    expect(res.ok).toBe(true);
    expect(d.assignRecruiterToClient).not.toHaveBeenCalled();
  });

  it("ignora en silencio un responsable elegido que no existe o no es de esta org", async () => {
    const d = deps({ member: null });
    const res = await crearCliente({ name: "Acme Corp", assignedMembershipId: "otro-id" }, ctx, d);
    expect(res.ok).toBe(true);
    expect(d.assignRecruiterToClient).not.toHaveBeenCalled();
  });

  it("siempre genera el link de compartir, con o sin responsable asignado", async () => {
    const sinResponsable = deps({ clientId: "client-9" });
    await crearCliente({ name: "Acme Corp" }, ctx, sinResponsable);
    expect(sinResponsable.createClientShare).toHaveBeenCalledWith({
      organizationId: "org-1",
      clientId: "client-9",
      token: "tok_abc",
      expiresAt: null,
      createdBy: "u1",
    });

    const conResponsable = deps({
      clientId: "client-9",
      member: { id: "membership-2", role: "owner", status: "active" },
    });
    await crearCliente({ name: "Acme Corp", assignedMembershipId: "membership-2" }, ctx, conResponsable);
    expect(conResponsable.createClientShare).toHaveBeenCalledTimes(1);
  });
});

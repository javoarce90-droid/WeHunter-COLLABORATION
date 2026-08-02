import { describe, it, expect, vi } from "vitest";
import { aceptarInvitacion } from "./aceptar-invitacion";
import type { AceptarInvitacionDeps, PendingInvitation } from "./aceptar-invitacion";

const pending: PendingInvitation = {
  id: "inv-1",
  organizationId: "org-1",
  email: "nueva@empresa.com",
  inviteeName: "Nueva Persona",
  role: "recruiter",
  status: "pending",
  expiresAt: new Date(Date.now() + 60_000),
};

function deps(overrides: Partial<AceptarInvitacionDeps> = {}): AceptarInvitacionDeps {
  return {
    getInvitationByToken: vi.fn().mockResolvedValue(pending),
    findProfileByEmail: vi.fn().mockResolvedValue(null),
    createAuthUser: vi.fn().mockResolvedValue({ id: "profile-nuevo" }),
    createMembership: vi.fn().mockResolvedValue(undefined),
    markInvitationAccepted: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("aceptarInvitacion", () => {
  it("token inexistente", async () => {
    const d = deps({ getInvitationByToken: vi.fn().mockResolvedValue(null) });
    const r = await aceptarInvitacion({ token: "x" }, d);
    expect(r.ok).toBe(false);
    expect(d.createMembership).not.toHaveBeenCalled();
  });

  it("invitación revocada", async () => {
    const d = deps({
      getInvitationByToken: vi.fn().mockResolvedValue({ ...pending, status: "revoked" }),
    });
    const r = await aceptarInvitacion({ token: "x", password: "abc12345" }, d);
    expect(r.ok).toBe(false);
  });

  it("invitación ya aceptada", async () => {
    const d = deps({
      getInvitationByToken: vi.fn().mockResolvedValue({ ...pending, status: "accepted" }),
    });
    const r = await aceptarInvitacion({ token: "x", password: "abc12345" }, d);
    expect(r.ok).toBe(false);
  });

  it("link vencido", async () => {
    const d = deps({
      getInvitationByToken: vi
        .fn()
        .mockResolvedValue({ ...pending, expiresAt: new Date(Date.now() - 1000) }),
    });
    const r = await aceptarInvitacion({ token: "x", password: "abc12345" }, d);
    expect(r.ok).toBe(false);
  });

  it("perfil ya existente: crea membership, no pide contraseña ni cuenta nueva", async () => {
    const d = deps({ findProfileByEmail: vi.fn().mockResolvedValue({ id: "profile-existente" }) });
    const r = await aceptarInvitacion({ token: "x" }, d);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.requiresLogin).toBe(true);
    expect(d.createAuthUser).not.toHaveBeenCalled();
    expect(d.createMembership).toHaveBeenCalledWith({
      organizationId: "org-1",
      profileId: "profile-existente",
      role: "recruiter",
    });
    expect(d.markInvitationAccepted).toHaveBeenCalledWith("inv-1");
  });

  it("perfil nuevo sin contraseña: rechaza", async () => {
    const d = deps();
    const r = await aceptarInvitacion({ token: "x" }, d);
    expect(r.ok).toBe(false);
    expect(d.createAuthUser).not.toHaveBeenCalled();
  });

  it("perfil nuevo con contraseña: crea cuenta + membership, sin requerir login aparte", async () => {
    const d = deps();
    const r = await aceptarInvitacion({ token: "x", password: "abc12345" }, d);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.requiresLogin).toBe(false);
    expect(d.createAuthUser).toHaveBeenCalledWith({
      email: "nueva@empresa.com",
      password: "abc12345",
      fullName: "Nueva Persona",
    });
    expect(d.createMembership).toHaveBeenCalledWith({
      organizationId: "org-1",
      profileId: "profile-nuevo",
      role: "recruiter",
    });
  });

  it("si falla la creación de la cuenta, propaga el error sin crear membership", async () => {
    const d = deps({ createAuthUser: vi.fn().mockResolvedValue({ error: "boom" }) });
    const r = await aceptarInvitacion({ token: "x", password: "abc12345" }, d);
    expect(r.ok).toBe(false);
    expect(d.createMembership).not.toHaveBeenCalled();
  });
});

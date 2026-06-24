import { describe, it, expect, vi } from "vitest";
import { invitarMiembro, actualizarMiembro } from "./gestionar-equipo";
import type { TeamContext, InvitarDeps, ActualizarDeps } from "./gestionar-equipo";

const owner: TeamContext = { userId: "u-owner", organizationId: "org-1", role: "owner" };

describe("invitarMiembro", () => {
  const deps = (): InvitarDeps => ({ createInvitation: vi.fn().mockResolvedValue(undefined) });

  it("el owner invita con un rol asignable", async () => {
    const d = deps();
    const r = await invitarMiembro({ email: "x@y.com", role: "recruiter", token: "t" }, owner, d);
    expect(r.ok).toBe(true);
    expect(d.createInvitation).toHaveBeenCalled();
  });

  it("un recruiter no puede invitar", async () => {
    const r = await invitarMiembro(
      { email: "x@y.com", role: "recruiter", token: "t" },
      { ...owner, role: "recruiter" },
      deps(),
    );
    expect(r.ok).toBe(false);
  });

  it("no se puede invitar como owner", async () => {
    const r = await invitarMiembro({ email: "x@y.com", role: "owner", token: "t" }, owner, deps());
    expect(r.ok).toBe(false);
  });
});

describe("actualizarMiembro", () => {
  const deps = (
    target: { id: string; role: "owner" | "admin" | "recruiter" | "consultant"; profileId: string } | null,
  ): ActualizarDeps => ({
    getMembership: vi.fn().mockResolvedValue(target),
    updateMembership: vi.fn().mockResolvedValue(undefined),
  });

  it("cambia el rol de un miembro", async () => {
    const d = deps({ id: "m-1", role: "recruiter", profileId: "u-2" });
    const r = await actualizarMiembro({ membershipId: "m-1", role: "admin" }, owner, d);
    expect(r.ok).toBe(true);
    expect(d.updateMembership).toHaveBeenCalledWith("m-1", { role: "admin" });
  });

  it("desactiva un miembro", async () => {
    const d = deps({ id: "m-1", role: "recruiter", profileId: "u-2" });
    const r = await actualizarMiembro({ membershipId: "m-1", status: "inactive" }, owner, d);
    expect(r.ok).toBe(true);
    expect(d.updateMembership).toHaveBeenCalledWith("m-1", { status: "inactive" });
  });

  it("no se puede modificar al owner", async () => {
    const d = deps({ id: "m-owner", role: "owner", profileId: "u-owner" });
    const r = await actualizarMiembro({ membershipId: "m-owner", role: "admin" }, owner, d);
    expect(r.ok).toBe(false);
    expect(d.updateMembership).not.toHaveBeenCalled();
  });

  it("no podés desactivarte a vos mismo", async () => {
    const d = deps({ id: "m-self", role: "admin", profileId: "u-owner" });
    const r = await actualizarMiembro({ membershipId: "m-self", status: "inactive" }, owner, d);
    expect(r.ok).toBe(false);
  });

  it("un recruiter no puede gestionar", async () => {
    const d = deps({ id: "m-1", role: "recruiter", profileId: "u-2" });
    const r = await actualizarMiembro(
      { membershipId: "m-1", role: "admin" },
      { ...owner, role: "recruiter" },
      d,
    );
    expect(r.ok).toBe(false);
  });

  it("rechaza si no hay nada para actualizar", async () => {
    const d = deps({ id: "m-1", role: "recruiter", profileId: "u-2" });
    const r = await actualizarMiembro({ membershipId: "m-1" }, owner, d);
    expect(r.ok).toBe(false);
  });
});

import { describe, it, expect, vi } from "vitest";
import {
  invitarMiembro,
  actualizarMiembro,
  eliminarMiembro,
  assignableRolesFor,
  canInviteMore,
  maxMembersFor,
  MAX_TEAM_MEMBERS,
} from "./gestionar-equipo";
import type {
  TeamContext,
  InvitarContext,
  InvitarDeps,
  ActualizarDeps,
  EliminarDeps,
} from "./gestionar-equipo";
import type { OrgRole } from "@/lib/auth/session";

const owner: TeamContext = {
  userId: "u-owner",
  organizationId: "org-1",
  role: "owner",
  workspaceType: "team",
};
// Contexto base para invitar: 1 miembro existente (el owner), hay lugar hasta 5 en plan Team.
const ownerInvite: InvitarContext = { ...owner, currentMemberCount: 1 };

describe("assignableRolesFor", () => {
  it("excluye hiring_manager fuera de Enterprise", () => {
    expect(assignableRolesFor("freelance")).not.toContain("hiring_manager");
    expect(assignableRolesFor("team")).not.toContain("hiring_manager");
    expect(assignableRolesFor(null)).not.toContain("hiring_manager");
  });

  it("incluye hiring_manager en Enterprise", () => {
    expect(assignableRolesFor("enterprise")).toContain("hiring_manager");
  });
});

describe("canInviteMore / maxMembersFor", () => {
  it("Freelancer nunca permite invitar, ya con el owner solo", () => {
    expect(maxMembersFor("freelance")).toBe(1);
    expect(canInviteMore("freelance", 1)).toBe(false);
  });

  it("Team/Enterprise permiten hasta el tope de plan", () => {
    expect(maxMembersFor("team")).toBe(MAX_TEAM_MEMBERS);
    expect(maxMembersFor("enterprise")).toBe(MAX_TEAM_MEMBERS);
    expect(canInviteMore("team", MAX_TEAM_MEMBERS - 1)).toBe(true);
    expect(canInviteMore("team", MAX_TEAM_MEMBERS)).toBe(false);
    expect(canInviteMore("enterprise", MAX_TEAM_MEMBERS)).toBe(false);
  });

  it("org legado sin workspaceType se trata como Team", () => {
    expect(maxMembersFor(null)).toBe(MAX_TEAM_MEMBERS);
  });
});

describe("invitarMiembro", () => {
  const deps = (): InvitarDeps => ({ createInvitation: vi.fn().mockResolvedValue(undefined) });

  it("el owner invita con un rol asignable", async () => {
    const d = deps();
    const r = await invitarMiembro(
      { name: "X Y", email: "x@y.com", role: "recruiter", token: "t" },
      ownerInvite,
      d,
    );
    expect(r.ok).toBe(true);
    expect(d.createInvitation).toHaveBeenCalled();
  });

  it("un recruiter no puede invitar", async () => {
    const r = await invitarMiembro(
      { name: "X Y", email: "x@y.com", role: "recruiter", token: "t" },
      { ...ownerInvite, role: "recruiter" },
      deps(),
    );
    expect(r.ok).toBe(false);
  });

  it("no se puede invitar como owner", async () => {
    const r = await invitarMiembro(
      { name: "X Y", email: "x@y.com", role: "owner", token: "t" },
      ownerInvite,
      deps(),
    );
    expect(r.ok).toBe(false);
  });

  it("rechaza sin nombre completo", async () => {
    const r = await invitarMiembro(
      { name: "a", email: "x@y.com", role: "recruiter", token: "t" },
      ownerInvite,
      deps(),
    );
    expect(r.ok).toBe(false);
  });

  it("no se puede invitar como hiring_manager fuera de Enterprise", async () => {
    const d = deps();
    const r = await invitarMiembro(
      { name: "X Y", email: "x@y.com", role: "hiring_manager", token: "t" },
      { ...ownerInvite, workspaceType: "team" },
      d,
    );
    expect(r.ok).toBe(false);
    expect(d.createInvitation).not.toHaveBeenCalled();
  });

  it("sí se puede invitar como hiring_manager en Enterprise", async () => {
    const d = deps();
    const r = await invitarMiembro(
      { name: "X Y", email: "x@y.com", role: "hiring_manager", token: "t" },
      { ...ownerInvite, workspaceType: "enterprise" },
      d,
    );
    expect(r.ok).toBe(true);
    expect(d.createInvitation).toHaveBeenCalled();
  });

  it("Freelancer no puede invitar aunque sea el primer miembro", async () => {
    const d = deps();
    const r = await invitarMiembro(
      { name: "X Y", email: "x@y.com", role: "recruiter", token: "t" },
      { ...ownerInvite, workspaceType: "freelance", currentMemberCount: 1 },
      d,
    );
    expect(r.ok).toBe(false);
    expect(d.createInvitation).not.toHaveBeenCalled();
  });

  it("Team rechaza al llegar al tope contando invitaciones pendientes", async () => {
    const d = deps();
    const r = await invitarMiembro(
      { name: "X Y", email: "x@y.com", role: "recruiter", token: "t" },
      { ...ownerInvite, currentMemberCount: MAX_TEAM_MEMBERS },
      d,
    );
    expect(r.ok).toBe(false);
    expect(d.createInvitation).not.toHaveBeenCalled();
  });
});

describe("actualizarMiembro", () => {
  const deps = (
    target: { id: string; role: OrgRole; profileId: string } | null,
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

  it("cambia el rol a uno de los agregados después (sourcer)", async () => {
    const d = deps({ id: "m-1", role: "recruiter", profileId: "u-2" });
    const r = await actualizarMiembro({ membershipId: "m-1", role: "sourcer" }, owner, d);
    expect(r.ok).toBe(true);
    expect(d.updateMembership).toHaveBeenCalledWith("m-1", { role: "sourcer" });
  });

  it("desactiva un miembro", async () => {
    const d = deps({ id: "m-1", role: "recruiter", profileId: "u-2" });
    const r = await actualizarMiembro({ membershipId: "m-1", status: "inactive" }, owner, d);
    expect(r.ok).toBe(true);
    expect(d.updateMembership).toHaveBeenCalledWith("m-1", { status: "inactive" });
  });

  it("no se puede promover a hiring_manager fuera de Enterprise", async () => {
    const d = deps({ id: "m-1", role: "recruiter", profileId: "u-2" });
    const r = await actualizarMiembro(
      { membershipId: "m-1", role: "hiring_manager" },
      { ...owner, workspaceType: "team" },
      d,
    );
    expect(r.ok).toBe(false);
    expect(d.updateMembership).not.toHaveBeenCalled();
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

describe("eliminarMiembro", () => {
  const deps = (
    target: { id: string; role: OrgRole; profileId: string } | null,
  ): EliminarDeps => ({
    getMembership: vi.fn().mockResolvedValue(target),
    deleteMembership: vi.fn().mockResolvedValue(undefined),
  });

  it("elimina la membership de un miembro", async () => {
    const d = deps({ id: "m-1", role: "recruiter", profileId: "u-2" });
    const r = await eliminarMiembro({ membershipId: "m-1" }, owner, d);
    expect(r.ok).toBe(true);
    expect(d.deleteMembership).toHaveBeenCalledWith("m-1", "org-1");
  });

  it("no se puede eliminar al owner", async () => {
    const d = deps({ id: "m-owner", role: "owner", profileId: "u-owner" });
    const r = await eliminarMiembro({ membershipId: "m-owner" }, owner, d);
    expect(r.ok).toBe(false);
    expect(d.deleteMembership).not.toHaveBeenCalled();
  });

  it("no podés eliminarte a vos mismo", async () => {
    const d = deps({ id: "m-self", role: "admin", profileId: "u-owner" });
    const r = await eliminarMiembro({ membershipId: "m-self" }, owner, d);
    expect(r.ok).toBe(false);
  });

  it("un recruiter no puede eliminar miembros", async () => {
    const d = deps({ id: "m-1", role: "recruiter", profileId: "u-2" });
    const r = await eliminarMiembro({ membershipId: "m-1" }, { ...owner, role: "recruiter" }, d);
    expect(r.ok).toBe(false);
  });

  it("miembro no encontrado", async () => {
    const d = deps(null);
    const r = await eliminarMiembro({ membershipId: "m-x" }, owner, d);
    expect(r.ok).toBe(false);
  });
});

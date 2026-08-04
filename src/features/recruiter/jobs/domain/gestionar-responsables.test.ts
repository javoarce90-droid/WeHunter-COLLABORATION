import { describe, it, expect, vi } from "vitest";
import {
  reasignarResponsable,
  actualizarSourcer,
  canAssignResponsable,
  canAssignSourcer,
} from "./gestionar-responsables";
import type {
  GestionarResponsablesCtx,
  ReasignarResponsableDeps,
  ActualizarSourcerDeps,
} from "./gestionar-responsables";

describe("canAssignResponsable / canAssignSourcer", () => {
  it("responsable: solo owner/admin, sourcer: también recruiter", () => {
    expect(canAssignResponsable("owner", "team")).toBe(true);
    expect(canAssignResponsable("admin", "team")).toBe(true);
    expect(canAssignResponsable("recruiter", "team")).toBe(false);
    expect(canAssignSourcer("owner", "team")).toBe(true);
    expect(canAssignSourcer("admin", "team")).toBe(true);
    expect(canAssignSourcer("recruiter", "team")).toBe(true);
    expect(canAssignSourcer("consultant", "team")).toBe(false);
  });

  it("Freelance no permite ninguno de los dos, sin importar el rol", () => {
    expect(canAssignResponsable("owner", "freelance")).toBe(false);
    expect(canAssignResponsable("admin", "freelance")).toBe(false);
    expect(canAssignSourcer("owner", "freelance")).toBe(false);
    expect(canAssignSourcer("admin", "freelance")).toBe(false);
  });
});

// Solo owner/admin pueden reasignar responsable (el recruiter ya no puede).
const adminCtx: GestionarResponsablesCtx = {
  organizationId: "org-1",
  role: "admin",
  workspaceType: "team",
};

describe("reasignarResponsable", () => {
  const deps = (
    membership: { id: string; role: string; profileId: string; status: string } | null,
  ): ReasignarResponsableDeps => ({
    getMembership: vi.fn().mockResolvedValue(membership),
    updateAssignedTo: vi.fn().mockResolvedValue(undefined),
  }) as unknown as ReasignarResponsableDeps;

  it("reasigna a un recruiter activo", async () => {
    const d = deps({ id: "m-2", role: "recruiter", profileId: "u-2", status: "active" });
    const r = await reasignarResponsable({ jobId: "job-1", membershipId: "m-2" }, adminCtx, d);
    expect(r.ok).toBe(true);
    expect(d.updateAssignedTo).toHaveBeenCalledWith("job-1", "org-1", "m-2");
  });

  it("reasigna a un consultor externo activo", async () => {
    const d = deps({ id: "m-3", role: "consultant", profileId: "u-3", status: "active" });
    const r = await reasignarResponsable({ jobId: "job-1", membershipId: "m-3" }, adminCtx, d);
    expect(r.ok).toBe(true);
  });

  it("rechaza un sourcer como responsable", async () => {
    const d = deps({ id: "m-4", role: "sourcer", profileId: "u-4", status: "active" });
    const r = await reasignarResponsable({ jobId: "job-1", membershipId: "m-4" }, adminCtx, d);
    expect(r.ok).toBe(false);
    expect(d.updateAssignedTo).not.toHaveBeenCalled();
  });

  it("rechaza un miembro inactivo", async () => {
    const d = deps({ id: "m-2", role: "recruiter", profileId: "u-2", status: "inactive" });
    const r = await reasignarResponsable({ jobId: "job-1", membershipId: "m-2" }, adminCtx, d);
    expect(r.ok).toBe(false);
    expect(d.updateAssignedTo).not.toHaveBeenCalled();
  });

  it("rechaza un membership inexistente", async () => {
    const d = deps(null);
    const r = await reasignarResponsable({ jobId: "job-1", membershipId: "m-x" }, adminCtx, d);
    expect(r.ok).toBe(false);
    expect(d.updateAssignedTo).not.toHaveBeenCalled();
  });

  it("un consultor externo no puede reasignar (no es owner/admin)", async () => {
    const d = deps({ id: "m-2", role: "recruiter", profileId: "u-2", status: "active" });
    const r = await reasignarResponsable(
      { jobId: "job-1", membershipId: "m-2" },
      { ...adminCtx, role: "consultant" },
      d,
    );
    expect(r.ok).toBe(false);
    expect(d.updateAssignedTo).not.toHaveBeenCalled();
  });

  it("un recruiter ya no puede reasignar el responsable", async () => {
    const d = deps({ id: "m-2", role: "recruiter", profileId: "u-2", status: "active" });
    const r = await reasignarResponsable(
      { jobId: "job-1", membershipId: "m-2" },
      { ...adminCtx, role: "recruiter" },
      d,
    );
    expect(r.ok).toBe(false);
    expect(d.updateAssignedTo).not.toHaveBeenCalled();
  });

  it("en Freelance ni el owner puede reasignar", async () => {
    const d = deps({ id: "m-2", role: "recruiter", profileId: "u-2", status: "active" });
    const r = await reasignarResponsable(
      { jobId: "job-1", membershipId: "m-2" },
      { ...adminCtx, role: "owner", workspaceType: "freelance" },
      d,
    );
    expect(r.ok).toBe(false);
    expect(d.updateAssignedTo).not.toHaveBeenCalled();
  });
});

// El recruiter sí puede asignar Sourcer (además de owner/admin) — se mantiene como default.
const recruiterCtx: GestionarResponsablesCtx = {
  organizationId: "org-1",
  role: "recruiter",
  workspaceType: "team",
};

describe("actualizarSourcer", () => {
  const deps = (
    membership: { id: string; role: string; profileId: string; status: string } | null,
  ): ActualizarSourcerDeps => ({
    getMembership: vi.fn().mockResolvedValue(membership),
    updateSourcer: vi.fn().mockResolvedValue(undefined),
  }) as unknown as ActualizarSourcerDeps;

  it("un recruiter asigna un sourcer activo", async () => {
    const d = deps({ id: "m-5", role: "sourcer", profileId: "u-5", status: "active" });
    const r = await actualizarSourcer({ jobId: "job-1", membershipId: "m-5" }, recruiterCtx, d);
    expect(r.ok).toBe(true);
    expect(d.updateSourcer).toHaveBeenCalledWith("job-1", "org-1", "m-5");
  });

  it("rechaza un membership que no tiene rol sourcer", async () => {
    const d = deps({ id: "m-2", role: "recruiter", profileId: "u-2", status: "active" });
    const r = await actualizarSourcer({ jobId: "job-1", membershipId: "m-2" }, recruiterCtx, d);
    expect(r.ok).toBe(false);
    expect(d.updateSourcer).not.toHaveBeenCalled();
  });

  it("rechaza un sourcer inactivo", async () => {
    const d = deps({ id: "m-5", role: "sourcer", profileId: "u-5", status: "inactive" });
    const r = await actualizarSourcer({ jobId: "job-1", membershipId: "m-5" }, recruiterCtx, d);
    expect(r.ok).toBe(false);
  });

  it("permite sacar el sourcer (membershipId null) sin validar membership", async () => {
    const d = deps(null);
    const r = await actualizarSourcer({ jobId: "job-1", membershipId: null }, recruiterCtx, d);
    expect(r.ok).toBe(true);
    expect(d.getMembership).not.toHaveBeenCalled();
    expect(d.updateSourcer).toHaveBeenCalledWith("job-1", "org-1", null);
  });

  it("rechaza sin permisos de gestión", async () => {
    const d = deps({ id: "m-5", role: "sourcer", profileId: "u-5", status: "active" });
    const r = await actualizarSourcer(
      { jobId: "job-1", membershipId: "m-5" },
      { ...recruiterCtx, role: "viewer" },
      d,
    );
    expect(r.ok).toBe(false);
    expect(d.updateSourcer).not.toHaveBeenCalled();
  });

  it("en Freelance ni el owner puede asignar sourcer", async () => {
    const d = deps({ id: "m-5", role: "sourcer", profileId: "u-5", status: "active" });
    const r = await actualizarSourcer(
      { jobId: "job-1", membershipId: "m-5" },
      { ...recruiterCtx, role: "owner", workspaceType: "freelance" },
      d,
    );
    expect(r.ok).toBe(false);
    expect(d.updateSourcer).not.toHaveBeenCalled();
  });
});

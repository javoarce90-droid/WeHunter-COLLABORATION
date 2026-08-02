import { describe, it, expect, vi } from "vitest";
import { reasignarResponsable, actualizarSourcer } from "./gestionar-responsables";
import type {
  GestionarResponsablesCtx,
  ReasignarResponsableDeps,
  ActualizarSourcerDeps,
} from "./gestionar-responsables";

const ctx: GestionarResponsablesCtx = { organizationId: "org-1", role: "recruiter" };

describe("reasignarResponsable", () => {
  const deps = (
    membership: { id: string; role: string; profileId: string; status: string } | null,
  ): ReasignarResponsableDeps => ({
    getMembership: vi.fn().mockResolvedValue(membership),
    updateAssignedTo: vi.fn().mockResolvedValue(undefined),
  }) as unknown as ReasignarResponsableDeps;

  it("reasigna a un recruiter activo", async () => {
    const d = deps({ id: "m-2", role: "recruiter", profileId: "u-2", status: "active" });
    const r = await reasignarResponsable({ jobId: "job-1", membershipId: "m-2" }, ctx, d);
    expect(r.ok).toBe(true);
    expect(d.updateAssignedTo).toHaveBeenCalledWith("job-1", "org-1", "m-2");
  });

  it("reasigna a un consultor externo activo", async () => {
    const d = deps({ id: "m-3", role: "consultant", profileId: "u-3", status: "active" });
    const r = await reasignarResponsable({ jobId: "job-1", membershipId: "m-3" }, ctx, d);
    expect(r.ok).toBe(true);
  });

  it("rechaza un sourcer como responsable", async () => {
    const d = deps({ id: "m-4", role: "sourcer", profileId: "u-4", status: "active" });
    const r = await reasignarResponsable({ jobId: "job-1", membershipId: "m-4" }, ctx, d);
    expect(r.ok).toBe(false);
    expect(d.updateAssignedTo).not.toHaveBeenCalled();
  });

  it("rechaza un miembro inactivo", async () => {
    const d = deps({ id: "m-2", role: "recruiter", profileId: "u-2", status: "inactive" });
    const r = await reasignarResponsable({ jobId: "job-1", membershipId: "m-2" }, ctx, d);
    expect(r.ok).toBe(false);
    expect(d.updateAssignedTo).not.toHaveBeenCalled();
  });

  it("rechaza un membership inexistente", async () => {
    const d = deps(null);
    const r = await reasignarResponsable({ jobId: "job-1", membershipId: "m-x" }, ctx, d);
    expect(r.ok).toBe(false);
    expect(d.updateAssignedTo).not.toHaveBeenCalled();
  });

  it("un consultor externo no puede reasignar (no gestiona búsquedas)", async () => {
    const d = deps({ id: "m-2", role: "recruiter", profileId: "u-2", status: "active" });
    const r = await reasignarResponsable(
      { jobId: "job-1", membershipId: "m-2" },
      { ...ctx, role: "consultant" },
      d,
    );
    expect(r.ok).toBe(false);
    expect(d.updateAssignedTo).not.toHaveBeenCalled();
  });
});

describe("actualizarSourcer", () => {
  const deps = (
    membership: { id: string; role: string; profileId: string; status: string } | null,
  ): ActualizarSourcerDeps => ({
    getMembership: vi.fn().mockResolvedValue(membership),
    updateSourcer: vi.fn().mockResolvedValue(undefined),
  }) as unknown as ActualizarSourcerDeps;

  it("asigna un sourcer activo", async () => {
    const d = deps({ id: "m-5", role: "sourcer", profileId: "u-5", status: "active" });
    const r = await actualizarSourcer({ jobId: "job-1", membershipId: "m-5" }, ctx, d);
    expect(r.ok).toBe(true);
    expect(d.updateSourcer).toHaveBeenCalledWith("job-1", "org-1", "m-5");
  });

  it("rechaza un membership que no tiene rol sourcer", async () => {
    const d = deps({ id: "m-2", role: "recruiter", profileId: "u-2", status: "active" });
    const r = await actualizarSourcer({ jobId: "job-1", membershipId: "m-2" }, ctx, d);
    expect(r.ok).toBe(false);
    expect(d.updateSourcer).not.toHaveBeenCalled();
  });

  it("rechaza un sourcer inactivo", async () => {
    const d = deps({ id: "m-5", role: "sourcer", profileId: "u-5", status: "inactive" });
    const r = await actualizarSourcer({ jobId: "job-1", membershipId: "m-5" }, ctx, d);
    expect(r.ok).toBe(false);
  });

  it("permite sacar el sourcer (membershipId null) sin validar membership", async () => {
    const d = deps(null);
    const r = await actualizarSourcer({ jobId: "job-1", membershipId: null }, ctx, d);
    expect(r.ok).toBe(true);
    expect(d.getMembership).not.toHaveBeenCalled();
    expect(d.updateSourcer).toHaveBeenCalledWith("job-1", "org-1", null);
  });

  it("rechaza sin permisos de gestión", async () => {
    const d = deps({ id: "m-5", role: "sourcer", profileId: "u-5", status: "active" });
    const r = await actualizarSourcer(
      { jobId: "job-1", membershipId: "m-5" },
      { ...ctx, role: "viewer" },
      d,
    );
    expect(r.ok).toBe(false);
    expect(d.updateSourcer).not.toHaveBeenCalled();
  });
});

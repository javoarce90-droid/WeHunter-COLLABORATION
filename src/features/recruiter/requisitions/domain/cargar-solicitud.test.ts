import { describe, it, expect, vi } from "vitest";
import { cargarSolicitud } from "./cargar-solicitud";
import type { CargarSolicitudCtx, CargarSolicitudDeps, CargarSolicitudInput } from "./cargar-solicitud";

const makeDeps = (overrides?: Partial<CargarSolicitudDeps>): CargarSolicitudDeps => ({
  getMembership: vi.fn().mockResolvedValue({ id: "mem-recruiter", role: "recruiter", status: "active" }),
  createRequisitionFromHM: vi.fn().mockResolvedValue({ requisitionId: "req-1" }),
  ...overrides,
});

const ctx: CargarSolicitudCtx = {
  userId: "hm-user-1",
  organizationId: "org-1",
  role: "hiring_manager",
};

const input: CargarSolicitudInput = {
  assignedToMembershipId: "mem-recruiter",
  reason: "new_position",
  title: "Data Analyst Senior",
  modality: "remote",
  seniority: "senior",
  employmentType: "full_time",
};

describe("cargarSolicitud", () => {
  it("crea la solicitud asignada al recruiter elegido", async () => {
    const deps = makeDeps();
    const result = await cargarSolicitud(input, ctx, deps);
    expect(result.ok).toBe(true);
    expect(deps.createRequisitionFromHM).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        createdByProfileId: "hm-user-1",
        assignedToMembershipId: "mem-recruiter",
        draft: expect.objectContaining({ title: "Data Analyst Senior", reason: "new_position" }),
      }),
    );
  });

  it("solo el Hiring Manager puede cargar (recruiter/owner no usan este camino)", async () => {
    const deps = makeDeps();
    const result = await cargarSolicitud(input, { ...ctx, role: "recruiter" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/permisos/i);
    expect(deps.createRequisitionFromHM).not.toHaveBeenCalled();
  });

  it("rechaza un recruiter que no existe en la org", async () => {
    const deps = makeDeps({ getMembership: vi.fn().mockResolvedValue(null) });
    const result = await cargarSolicitud(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no existe/i);
    expect(deps.createRequisitionFromHM).not.toHaveBeenCalled();
  });

  it("rechaza un recruiter inactivo", async () => {
    const deps = makeDeps({
      getMembership: vi.fn().mockResolvedValue({ id: "mem-recruiter", role: "recruiter", status: "inactive" }),
    });
    const result = await cargarSolicitud(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/inactivo/i);
    expect(deps.createRequisitionFromHM).not.toHaveBeenCalled();
  });

  it("no permite asignarla a otro Hiring Manager (no puede revisar)", async () => {
    const deps = makeDeps({
      getMembership: vi.fn().mockResolvedValue({ id: "mem-hm-2", role: "hiring_manager", status: "active" }),
    });
    const result = await cargarSolicitud(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no puede revisar/i);
    expect(deps.createRequisitionFromHM).not.toHaveBeenCalled();
  });

  it("valida el título mínimo", async () => {
    const deps = makeDeps();
    const result = await cargarSolicitud({ ...input, title: "Da" }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/corto/i);
    expect(deps.createRequisitionFromHM).not.toHaveBeenCalled();
  });

  it("valida el motivo", async () => {
    const deps = makeDeps();
    const result = await cargarSolicitud({ ...input, reason: "otra-cosa" }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/motivo/i);
    expect(deps.createRequisitionFromHM).not.toHaveBeenCalled();
  });
});

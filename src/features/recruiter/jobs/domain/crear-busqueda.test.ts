import { describe, it, expect, vi } from "vitest";
import { crearBusqueda, type CrearBusquedaDeps } from "./crear-busqueda";

const deps = (jobId = "job-1"): CrearBusquedaDeps => ({
  insertJob: vi.fn(async () => ({ jobId })),
});
const ctx = {
  userId: "u1",
  organizationId: "org-1",
  role: "recruiter" as const,
  membershipId: "m1",
  workspaceType: "team" as const,
};

describe("crearBusqueda", () => {
  it("rechaza sin sesión/organization", async () => {
    const d = deps();
    const res = await crearBusqueda(
      { title: "Dev" },
      { userId: null, organizationId: null, role: null, membershipId: null, workspaceType: null },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.insertJob).not.toHaveBeenCalled();
  });

  it("rechaza sin membership (sin org activa)", async () => {
    const d = deps();
    const res = await crearBusqueda({ title: "Dev" }, { ...ctx, membershipId: null }, d);
    expect(res.ok).toBe(false);
    expect(d.insertJob).not.toHaveBeenCalled();
  });

  it("rechaza al consultor (no gestiona búsquedas)", async () => {
    const d = deps();
    const res = await crearBusqueda({ title: "Dev Senior" }, { ...ctx, role: "consultant" }, d);
    expect(res.ok).toBe(false);
    expect(d.insertJob).not.toHaveBeenCalled();
  });

  it("rechaza título demasiado corto", async () => {
    const d = deps();
    const res = await crearBusqueda({ title: "ab" }, ctx, d);
    expect(res.ok).toBe(false);
  });

  it("crea draft con createdBy y normaliza campos", async () => {
    const d = deps("job-9");
    const res = await crearBusqueda(
      { title: "  Backend Engineer  ", description: "  Node + Postgres  " },
      ctx,
      d,
    );
    expect(res).toEqual({ ok: true, data: { jobId: "job-9" } });
    expect(d.insertJob).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        title: "Backend Engineer",
        description: "Node + Postgres",
        createdBy: "u1",
        assignedTo: "m1",
      }),
    );
  });

  it("descripción vacía se guarda como null", async () => {
    const d = deps();
    await crearBusqueda({ title: "Data Analyst", description: "   " }, ctx, d);
    expect(d.insertJob).toHaveBeenCalledWith(
      expect.objectContaining({ description: null }),
    );
  });

  it("un recruiter con cliente asignado no puede crear para otro cliente", async () => {
    const d = deps();
    const res = await crearBusqueda(
      { title: "Backend Engineer", clientId: "client-2" },
      { ...ctx, assignedClientId: "client-1" },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.insertJob).not.toHaveBeenCalled();
  });

  it("un recruiter con cliente asignado sí puede crear para ese mismo cliente", async () => {
    const d = deps();
    const res = await crearBusqueda(
      { title: "Backend Engineer", clientId: "client-1" },
      { ...ctx, assignedClientId: "client-1" },
      d,
    );
    expect(res.ok).toBe(true);
  });

  it("sin cliente asignado no hay restricción de clientId", async () => {
    const d = deps();
    const res = await crearBusqueda(
      { title: "Backend Engineer", clientId: "cualquiera" },
      ctx,
      d,
    );
    expect(res.ok).toBe(true);
  });

  it("un owner con assignedClientId puede crear para cualquier cliente", async () => {
    const d = deps();
    const res = await crearBusqueda(
      { title: "Backend Engineer", clientId: "client-2" },
      { ...ctx, role: "owner", assignedClientId: "client-1" },
      d,
    );
    expect(res.ok).toBe(true);
  });

  it("un admin con assignedClientId puede crear para cualquier cliente", async () => {
    const d = deps();
    const res = await crearBusqueda(
      { title: "Backend Engineer", clientId: "client-2" },
      { ...ctx, role: "admin", assignedClientId: "client-1" },
      d,
    );
    expect(res.ok).toBe(true);
  });

  it("en Enterprise no aplica la restricción de cliente asignado (no existe la figura)", async () => {
    const d = deps();
    const res = await crearBusqueda(
      { title: "Backend Engineer", clientId: "client-2" },
      { ...ctx, workspaceType: "enterprise", assignedClientId: "client-1" },
      d,
    );
    expect(res.ok).toBe(true);
  });
});

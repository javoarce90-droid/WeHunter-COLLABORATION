import { describe, it, expect, vi } from "vitest";
import { crearBusqueda, type CrearBusquedaDeps } from "./crear-busqueda";

const deps = (jobId = "job-1"): CrearBusquedaDeps => ({
  insertJob: vi.fn(async () => ({ jobId })),
});
const ctx = { userId: "u1", organizationId: "org-1", role: "recruiter" as const };

describe("crearBusqueda", () => {
  it("rechaza sin sesión/organization", async () => {
    const d = deps();
    const res = await crearBusqueda(
      { title: "Dev" },
      { userId: null, organizationId: null, role: null },
      d,
    );
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
});

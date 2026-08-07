import { describe, it, expect, vi } from "vitest";
import { editarBusqueda, type EditarBusquedaDeps } from "./editar-busqueda";

const deps = (updated = true): EditarBusquedaDeps => ({
  updateJobFields: vi.fn(async () => ({ updated })),
});
const ctx = {
  organizationId: "org-1",
  role: "recruiter" as const,
  membershipId: "m1",
  workspaceType: "team" as const,
};

describe("editarBusqueda", () => {
  it("rechaza al consultor", async () => {
    const d = deps();
    const res = await editarBusqueda(
      { jobId: "j1", title: "Nuevo título" },
      { ...ctx, role: "consultant" },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.updateJobFields).not.toHaveBeenCalled();
  });

  it("rechaza título corto", async () => {
    const d = deps();
    const res = await editarBusqueda({ jobId: "j1", title: "ab" }, ctx, d);
    expect(res.ok).toBe(false);
  });

  it("falla si la búsqueda no existe (updated=false)", async () => {
    const d = deps(false);
    const res = await editarBusqueda({ jobId: "j1", title: "Backend Eng" }, ctx, d);
    expect(res.ok).toBe(false);
  });

  it("edita y normaliza campos", async () => {
    const d = deps();
    const res = await editarBusqueda(
      { jobId: "j1", title: "  Backend Eng  ", description: "  remoto  " },
      ctx,
      d,
    );
    expect(res).toEqual({ ok: true, data: { jobId: "j1" } });
    expect(d.updateJobFields).toHaveBeenCalledWith(
      "j1",
      "org-1",
      expect.objectContaining({ title: "Backend Eng", description: "remoto" }),
      "m1",
    );
  });

  it("owner/admin no quedan acotados a una búsqueda asignada (sin scope)", async () => {
    const d = deps();
    await editarBusqueda(
      { jobId: "j1", title: "Backend Eng" },
      { ...ctx, role: "owner" },
      d,
    );
    expect(d.updateJobFields).toHaveBeenCalledWith(
      "j1",
      "org-1",
      expect.objectContaining({ title: "Backend Eng" }),
      undefined,
    );
  });

  it("un recruiter Team con cliente asignado no puede cambiar el clientId a otro cliente", async () => {
    const d = deps();
    const res = await editarBusqueda(
      { jobId: "j1", title: "Backend Eng", clientId: "client-2" },
      { ...ctx, assignedClientId: "client-1" },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.updateJobFields).not.toHaveBeenCalled();
  });

  it("un recruiter Team con cliente asignado sí puede editar para ese mismo cliente", async () => {
    const d = deps();
    const res = await editarBusqueda(
      { jobId: "j1", title: "Backend Eng", clientId: "client-1" },
      { ...ctx, assignedClientId: "client-1" },
      d,
    );
    expect(res.ok).toBe(true);
  });

  it("un owner con cliente asignado puede editar el clientId a cualquier cliente", async () => {
    const d = deps();
    const res = await editarBusqueda(
      { jobId: "j1", title: "Backend Eng", clientId: "client-2" },
      { ...ctx, role: "owner", assignedClientId: "client-1" },
      d,
    );
    expect(res.ok).toBe(true);
  });

  it("en Enterprise no aplica la restricción de cliente asignado", async () => {
    const d = deps();
    const res = await editarBusqueda(
      { jobId: "j1", title: "Backend Eng", clientId: "client-2" },
      { ...ctx, workspaceType: "enterprise", assignedClientId: "client-1" },
      d,
    );
    expect(res.ok).toBe(true);
  });
});

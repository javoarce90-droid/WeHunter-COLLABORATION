import { describe, it, expect, vi } from "vitest";
import { editarBusqueda, type EditarBusquedaDeps } from "./editar-busqueda";

const deps = (updated = true): EditarBusquedaDeps => ({
  updateJobFields: vi.fn(async () => ({ updated })),
});
const ctx = { organizationId: "org-1", role: "recruiter" as const };

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
    expect(d.updateJobFields).toHaveBeenCalledWith("j1", "org-1", {
      title: "Backend Eng",
      description: "remoto",
    });
  });
});

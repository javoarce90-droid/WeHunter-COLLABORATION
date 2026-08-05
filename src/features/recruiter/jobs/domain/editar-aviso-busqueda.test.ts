import { describe, it, expect, vi } from "vitest";
import { editarAvisoBusqueda, type EditarAvisoBusquedaDeps } from "./editar-aviso-busqueda";

const deps = (updated = true): EditarAvisoBusquedaDeps => ({
  updateJobAvisoFields: vi.fn(async () => ({ updated })),
});
const ctx = { organizationId: "org-1", role: "recruiter" as const, membershipId: "m1" };

describe("editarAvisoBusqueda", () => {
  it("rechaza al consultor", async () => {
    const d = deps();
    const res = await editarAvisoBusqueda(
      { jobId: "j1", objectives: "Liderar el equipo" },
      { ...ctx, role: "consultant" },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.updateJobAvisoFields).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión/organization", async () => {
    const d = deps();
    const res = await editarAvisoBusqueda(
      { jobId: "j1" },
      { organizationId: null, role: null, membershipId: null },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.updateJobAvisoFields).not.toHaveBeenCalled();
  });

  it("falla si la búsqueda no existe (updated=false)", async () => {
    const d = deps(false);
    const res = await editarAvisoBusqueda({ jobId: "j1" }, ctx, d);
    expect(res.ok).toBe(false);
  });

  it("guarda y normaliza los 3 campos de texto", async () => {
    const d = deps();
    const res = await editarAvisoBusqueda(
      {
        jobId: "j1",
        objectives: "  Liderar el equipo  ",
        requirements: "   ",
        responsibilities: "Diseñar servicios.",
      },
      ctx,
      d,
    );
    expect(res).toEqual({ ok: true, data: { jobId: "j1" } });
    expect(d.updateJobAvisoFields).toHaveBeenCalledWith(
      "j1",
      "org-1",
      {
        objectives: "Liderar el equipo",
        requirements: null,
        responsibilities: "Diseñar servicios.",
        benefits: null,
      },
      "m1",
    );
  });

  it("descarta beneficios en blanco y deja null si no queda ninguno", async () => {
    const d = deps();
    await editarAvisoBusqueda(
      { jobId: "j1", benefits: [{ name: "  ", description: "  " }, { name: "Home office", description: "" }] },
      ctx,
      d,
    );
    expect(d.updateJobAvisoFields).toHaveBeenCalledWith(
      "j1",
      "org-1",
      expect.objectContaining({ benefits: [{ name: "Home office", description: "" }] }),
      "m1",
    );
  });

  it("saca el heading redundante si el texto repite el título de la sección", async () => {
    const d = deps();
    await editarAvisoBusqueda(
      { jobId: "j1", objectives: "## Objetivos del puesto\nLiderar el equipo." },
      ctx,
      d,
    );
    expect(d.updateJobAvisoFields).toHaveBeenCalledWith(
      "j1",
      "org-1",
      expect.objectContaining({ objectives: "Liderar el equipo." }),
      "m1",
    );
  });
});

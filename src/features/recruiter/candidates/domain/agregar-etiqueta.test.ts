import { describe, it, expect, vi } from "vitest";
import { agregarEtiqueta } from "./agregar-etiqueta";
import type { AgregarEtiquetaDeps } from "./agregar-etiqueta";

const ctx = { organizationId: "org-1", role: "recruiter" as const };

const makeDeps = (over?: Partial<AgregarEtiquetaDeps>): AgregarEtiquetaDeps => ({
  getCandidateById: vi.fn().mockResolvedValue({ id: "c-1" }),
  findTagByName: vi.fn().mockResolvedValue(null),
  insertTag: vi.fn().mockResolvedValue({ id: "tag-1", name: "Top perfil" }),
  linkCandidateTag: vi.fn().mockResolvedValue(undefined),
  ...over,
});

describe("agregarEtiqueta", () => {
  it("crea una etiqueta nueva y la vincula al candidato", async () => {
    const deps = makeDeps();
    const res = await agregarEtiqueta({ candidateId: "c-1", tagName: "Top perfil" }, ctx, deps);
    expect(res.ok).toBe(true);
    expect(deps.insertTag).toHaveBeenCalledWith("org-1", "Top perfil");
    expect(deps.linkCandidateTag).toHaveBeenCalledWith({
      organizationId: "org-1",
      candidateId: "c-1",
      tagId: "tag-1",
    });
  });

  it("reusa una etiqueta existente en vez de duplicarla", async () => {
    const deps = makeDeps({
      findTagByName: vi.fn().mockResolvedValue({ id: "tag-existente", name: "Bilingüe" }),
    });
    const res = await agregarEtiqueta({ candidateId: "c-1", tagName: "bilingüe" }, ctx, deps);
    expect(res.ok).toBe(true);
    expect(deps.insertTag).not.toHaveBeenCalled();
    expect(deps.linkCandidateTag).toHaveBeenCalledWith({
      organizationId: "org-1",
      candidateId: "c-1",
      tagId: "tag-existente",
    });
  });

  it("rechaza un nombre vacío", async () => {
    const deps = makeDeps();
    const res = await agregarEtiqueta({ candidateId: "c-1", tagName: "   " }, ctx, deps);
    expect(res.ok).toBe(false);
    expect(deps.insertTag).not.toHaveBeenCalled();
    expect(deps.linkCandidateTag).not.toHaveBeenCalled();
  });

  it("rechaza si el candidato no existe", async () => {
    const deps = makeDeps({ getCandidateById: vi.fn().mockResolvedValue(null) });
    const res = await agregarEtiqueta({ candidateId: "x", tagName: "Top perfil" }, ctx, deps);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/no encontrado/i);
    expect(deps.linkCandidateTag).not.toHaveBeenCalled();
  });

  it("rechaza al consultor", async () => {
    const deps = makeDeps();
    const res = await agregarEtiqueta(
      { candidateId: "c-1", tagName: "Top perfil" },
      { ...ctx, role: "consultant" },
      deps,
    );
    expect(res.ok).toBe(false);
    expect(deps.linkCandidateTag).not.toHaveBeenCalled();
  });
});

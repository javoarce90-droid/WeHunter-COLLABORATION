import { describe, it, expect, vi } from "vitest";
import { quitarEtiqueta } from "./quitar-etiqueta";
import type { QuitarEtiquetaDeps } from "./quitar-etiqueta";

const ctx = { organizationId: "org-1", role: "recruiter" as const };

const makeDeps = (over?: Partial<QuitarEtiquetaDeps>): QuitarEtiquetaDeps => ({
  getCandidateById: vi.fn().mockResolvedValue({ id: "c-1" }),
  unlinkCandidateTag: vi.fn().mockResolvedValue(undefined),
  ...over,
});

describe("quitarEtiqueta", () => {
  it("saca el vínculo del candidato con el tag", async () => {
    const deps = makeDeps();
    const res = await quitarEtiqueta({ candidateId: "c-1", tagId: "tag-1" }, ctx, deps);
    expect(res.ok).toBe(true);
    expect(deps.unlinkCandidateTag).toHaveBeenCalledWith({
      organizationId: "org-1",
      candidateId: "c-1",
      tagId: "tag-1",
    });
  });

  it("rechaza si el candidato no existe", async () => {
    const deps = makeDeps({ getCandidateById: vi.fn().mockResolvedValue(null) });
    const res = await quitarEtiqueta({ candidateId: "x", tagId: "tag-1" }, ctx, deps);
    expect(res.ok).toBe(false);
    expect(deps.unlinkCandidateTag).not.toHaveBeenCalled();
  });

  it("rechaza al viewer", async () => {
    const deps = makeDeps();
    const res = await quitarEtiqueta(
      { candidateId: "c-1", tagId: "tag-1" },
      { ...ctx, role: "viewer" },
      deps,
    );
    expect(res.ok).toBe(false);
    expect(deps.unlinkCandidateTag).not.toHaveBeenCalled();
  });
});

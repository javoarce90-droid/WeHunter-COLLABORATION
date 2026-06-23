import { describe, it, expect, vi } from "vitest";
import { editarCandidato, type EditarCandidatoDeps } from "./editar-candidato";

const deps = (updated = true): EditarCandidatoDeps => ({
  updateCandidateFields: vi.fn(async () => ({ updated })),
});
const ctx = { organizationId: "org-1", role: "recruiter" as const };

describe("editarCandidato", () => {
  it("rechaza al consultor", async () => {
    const d = deps();
    const res = await editarCandidato(
      { candidateId: "cand-1", fullName: "Ada Lovelace" },
      { ...ctx, role: "consultant" },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.updateCandidateFields).not.toHaveBeenCalled();
  });

  it("error si el candidato no existe (o es de otra org)", async () => {
    const d = deps(false);
    const res = await editarCandidato(
      { candidateId: "cand-x", fullName: "Ada Lovelace" },
      ctx,
      d,
    );
    expect(res.ok).toBe(false);
  });

  it("edita sin tocar el CV cuando no se adjunta uno nuevo", async () => {
    const d = deps();
    const res = await editarCandidato(
      { candidateId: "cand-1", fullName: "  Ada L.  ", email: "ADA@X.COM" },
      ctx,
      d,
    );
    expect(res.ok).toBe(true);
    expect(d.updateCandidateFields).toHaveBeenCalledWith("cand-1", "org-1", {
      fullName: "Ada L.",
      email: "ada@x.com",
    });
  });

  it("reemplaza el CV cuando se adjunta uno nuevo", async () => {
    const uploadCv = vi.fn(async () => ({ path: "org-1/nuevo.pdf" }));
    const d = { ...deps(), uploadCv };
    await editarCandidato(
      { candidateId: "cand-1", fullName: "Ada Lovelace" },
      ctx,
      d,
    );
    expect(uploadCv).toHaveBeenCalledOnce();
    expect(d.updateCandidateFields).toHaveBeenCalledWith("cand-1", "org-1", {
      fullName: "Ada Lovelace",
      email: null,
      cvUrl: "org-1/nuevo.pdf",
    });
  });

  it("al reemplazar el CV borra el archivo anterior", async () => {
    const uploadCv = vi.fn(async () => ({ path: "org-1/nuevo.pdf" }));
    const deleteCv = vi.fn(async () => {});
    await editarCandidato(
      {
        candidateId: "cand-1",
        fullName: "Ada Lovelace",
        currentCvUrl: "org-1/viejo.pdf",
      },
      ctx,
      { ...deps(), uploadCv, deleteCv },
    );
    expect(deleteCv).toHaveBeenCalledWith("org-1/viejo.pdf");
  });

  it("no borra nada si no había CV anterior", async () => {
    const uploadCv = vi.fn(async () => ({ path: "org-1/nuevo.pdf" }));
    const deleteCv = vi.fn(async () => {});
    await editarCandidato(
      { candidateId: "cand-1", fullName: "Ada Lovelace", currentCvUrl: null },
      ctx,
      { ...deps(), uploadCv, deleteCv },
    );
    expect(deleteCv).not.toHaveBeenCalled();
  });

  it("falla de subida en edición devuelve err y no actualiza", async () => {
    const uploadCv = vi.fn(async () => {
      throw new Error("storage caído");
    });
    const d = { ...deps(), uploadCv };
    const res = await editarCandidato(
      { candidateId: "cand-1", fullName: "Ada Lovelace" },
      ctx,
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.updateCandidateFields).not.toHaveBeenCalled();
  });
});

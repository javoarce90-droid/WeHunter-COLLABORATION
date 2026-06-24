import { describe, it, expect, vi } from "vitest";
import { cargarCandidato, type CargarCandidatoDeps } from "./cargar-candidato";

const deps = (candidateId = "cand-1"): CargarCandidatoDeps => ({
  insertCandidate: vi.fn(async () => ({ candidateId })),
});
const ctx = { organizationId: "org-1", role: "recruiter" as const };

describe("cargarCandidato", () => {
  it("rechaza sin sesión/organization", async () => {
    const d = deps();
    const res = await cargarCandidato(
      { fullName: "Ada Lovelace" },
      { organizationId: null, role: null },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.insertCandidate).not.toHaveBeenCalled();
  });

  it("rechaza al consultor (no carga candidatos)", async () => {
    const d = deps();
    const res = await cargarCandidato(
      { fullName: "Ada Lovelace" },
      { ...ctx, role: "consultant" },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.insertCandidate).not.toHaveBeenCalled();
  });

  it("rechaza nombre demasiado corto", async () => {
    const d = deps();
    const res = await cargarCandidato({ fullName: "A" }, ctx, d);
    expect(res.ok).toBe(false);
    expect(d.insertCandidate).not.toHaveBeenCalled();
  });

  it("carga el candidato normalizando nombre y email", async () => {
    const d = deps("cand-9");
    const res = await cargarCandidato(
      { fullName: "  Ada Lovelace  ", email: "  ADA@Example.COM " },
      ctx,
      d,
    );
    expect(res).toEqual({ ok: true, data: { candidateId: "cand-9" } });
    expect(d.insertCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        fullName: "Ada Lovelace",
        email: "ada@example.com",
        cvUrl: null,
      }),
    );
  });

  it("email vacío se guarda como null", async () => {
    const d = deps();
    await cargarCandidato({ fullName: "Grace Hopper", email: "   " }, ctx, d);
    expect(d.insertCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ email: null }),
    );
  });

  it("sube el CV solo después de autorizar y guarda su path", async () => {
    const uploadCv = vi.fn(async () => ({ path: "org-1/abc.pdf" }));
    const d = { ...deps(), uploadCv };
    await cargarCandidato({ fullName: "Linus Torvalds" }, ctx, d);
    expect(uploadCv).toHaveBeenCalledOnce();
    expect(d.insertCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ cvUrl: "org-1/abc.pdf" }),
    );
  });

  it("no sube el CV si la autorización falla", async () => {
    const uploadCv = vi.fn(async () => ({ path: "x" }));
    const d = { ...deps(), uploadCv };
    const res = await cargarCandidato(
      { fullName: "Linus Torvalds" },
      { ...ctx, role: "consultant" },
      d,
    );
    expect(res.ok).toBe(false);
    expect(uploadCv).not.toHaveBeenCalled();
  });

  it("falla de subida del CV devuelve err y no inserta (sin crash)", async () => {
    const uploadCv = vi.fn(async () => {
      throw new Error("storage caído");
    });
    const d = { ...deps(), uploadCv };
    const res = await cargarCandidato({ fullName: "Margaret Hamilton" }, ctx, d);
    expect(res.ok).toBe(false);
    expect(d.insertCandidate).not.toHaveBeenCalled();
  });

  it("si el insert falla tras subir, borra el CV huérfano y propaga el error", async () => {
    const uploadCv = vi.fn(async () => ({ path: "org-1/huerfano.pdf" }));
    const deleteCv = vi.fn(async () => {});
    const insertCandidate = vi.fn(async () => {
      throw new Error("db caída");
    });
    await expect(
      cargarCandidato(
        { fullName: "Margaret Hamilton" },
        ctx,
        { uploadCv, deleteCv, insertCandidate },
      ),
    ).rejects.toThrow("db caída");
    expect(deleteCv).toHaveBeenCalledWith("org-1/huerfano.pdf");
  });
});

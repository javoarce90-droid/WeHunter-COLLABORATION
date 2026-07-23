import { describe, it, expect, vi } from "vitest";
import { cargarCandidato, type CargarCandidatoDeps } from "./cargar-candidato";

const deps = (candidateId = "cand-1"): CargarCandidatoDeps => ({
  findDuplicateCandidate: vi.fn(async () => null),
  findLinkableProfile: vi.fn(async () => null),
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

  it("rechaza si el email viene vacío o solo espacios (obligatorio al cargar)", async () => {
    const d = deps();
    const res = await cargarCandidato({ fullName: "Grace Hopper", email: "   " }, ctx, d);
    expect(res.ok).toBe(false);
    expect(d.insertCandidate).not.toHaveBeenCalled();
  });

  it("rechaza si falta el email directamente", async () => {
    const d = deps();
    const res = await cargarCandidato({ fullName: "Grace Hopper" }, ctx, d);
    expect(res.ok).toBe(false);
    expect(d.insertCandidate).not.toHaveBeenCalled();
  });

  it("normaliza el teléfono (trim) y lo guarda null si viene vacío", async () => {
    const d = deps();
    await cargarCandidato(
      { fullName: "Grace Hopper", email: "grace@example.com", phone: "  +54 9 351 555-1234  " },
      ctx,
      d,
    );
    expect(d.insertCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "+54 9 351 555-1234" }),
    );

    const d2 = deps();
    await cargarCandidato(
      { fullName: "Grace Hopper", email: "grace@example.com", phone: "   " },
      ctx,
      d2,
    );
    expect(d2.insertCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null }),
    );
  });

  it("sube el CV solo después de autorizar y guarda su path", async () => {
    const uploadCv = vi.fn(async () => ({ path: "org-1/abc.pdf" }));
    const d = { ...deps(), uploadCv };
    await cargarCandidato({ fullName: "Linus Torvalds", email: "linus@example.com" }, ctx, d);
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
    const res = await cargarCandidato(
      { fullName: "Margaret Hamilton", email: "margaret@example.com" },
      ctx,
      d,
    );
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
        { fullName: "Margaret Hamilton", email: "margaret@example.com" },
        ctx,
        {
          findDuplicateCandidate: vi.fn(async () => null),
          findLinkableProfile: vi.fn(async () => null),
          uploadCv,
          deleteCv,
          insertCandidate,
        },
      ),
    ).rejects.toThrow("db caída");
    expect(deleteCv).toHaveBeenCalledWith("org-1/huerfano.pdf");
  });

  it("rechaza y devuelve el duplicado si ya existe alguien con ese email/LinkedIn", async () => {
    const d = deps();
    d.findDuplicateCandidate = vi.fn(async () => ({
      id: "cand-existente",
      fullName: "Ada Lovelace",
      matchedBy: "email" as const,
    }));
    const res = await cargarCandidato(
      { fullName: "Ada L.", email: "ada@example.com" },
      ctx,
      d,
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.duplicate).toEqual({
      id: "cand-existente",
      fullName: "Ada Lovelace",
      matchedBy: "email",
    });
    expect(d.insertCandidate).not.toHaveBeenCalled();
  });

  it("con confirmDuplicate crea igual, sin volver a chequear duplicados", async () => {
    const d = deps("cand-9");
    d.findDuplicateCandidate = vi.fn(async () => ({
      id: "cand-existente",
      fullName: "Ada Lovelace",
      matchedBy: "email" as const,
    }));
    const res = await cargarCandidato(
      { fullName: "Ada L.", email: "ada@example.com", confirmDuplicate: true },
      ctx,
      d,
    );
    expect(res).toEqual({ ok: true, data: { candidateId: "cand-9" } });
    expect(d.findDuplicateCandidate).not.toHaveBeenCalled();
    expect(d.insertCandidate).toHaveBeenCalledOnce();
  });

  it("ofrece vincular si existe una cuenta real (profiles) con ese email", async () => {
    const d = deps();
    d.findLinkableProfile = vi.fn(async () => ({
      profileId: "profile-1",
      bio: "Bio real",
      skills: ["Go"],
      cvUrl: "profiles/1/cv.pdf",
    }));
    const res = await cargarCandidato(
      { fullName: "Ada L.", email: "ada@example.com" },
      ctx,
      d,
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.profileMatch).toBe(true);
    expect(d.insertCandidate).not.toHaveBeenCalled();
  });

  it("con skipProfileLink crea sin vincular, sin volver a ofrecer", async () => {
    const d = deps("cand-9");
    d.findLinkableProfile = vi.fn(async () => ({
      profileId: "profile-1",
      bio: "Bio real",
      skills: ["Go"],
      cvUrl: "profiles/1/cv.pdf",
    }));
    const res = await cargarCandidato(
      { fullName: "Ada L.", email: "ada@example.com", skipProfileLink: true },
      ctx,
      d,
    );
    expect(res).toEqual({ ok: true, data: { candidateId: "cand-9" } });
    expect(d.insertCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: null }),
    );
  });

  it("con linkProfile crea vinculado y copia bio/skills/cv de la cuenta real", async () => {
    const d = deps("cand-9");
    d.findLinkableProfile = vi.fn(async () => ({
      profileId: "profile-1",
      bio: "Bio real",
      skills: ["Go", "Rust"],
      cvUrl: "profiles/1/cv.pdf",
    }));
    const res = await cargarCandidato(
      {
        fullName: "Ada L.",
        email: "ada@example.com",
        linkProfile: true,
        summary: "lo que tipeó el recruiter",
        skills: ["Excel"],
      },
      ctx,
      d,
    );
    expect(res).toEqual({ ok: true, data: { candidateId: "cand-9" } });
    expect(d.insertCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: "profile-1",
        cvUrl: "profiles/1/cv.pdf",
        summary: "Bio real",
        skills: ["Go", "Rust"],
      }),
    );
  });

  it("no vincula a un profileId que no venga de re-derivar por email (sin duplicado ni match previo, crea sin vínculo)", async () => {
    const d = deps("cand-9");
    d.findLinkableProfile = vi.fn(async () => null);
    const res = await cargarCandidato(
      { fullName: "Ada L.", email: "ada@example.com", linkProfile: true },
      ctx,
      d,
    );
    expect(res).toEqual({ ok: true, data: { candidateId: "cand-9" } });
    expect(d.insertCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: null }),
    );
  });
});

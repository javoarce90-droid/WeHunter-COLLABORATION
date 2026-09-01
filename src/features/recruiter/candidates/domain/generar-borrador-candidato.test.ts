import { describe, it, expect, vi } from "vitest";
import { generarBorradorCandidato } from "./generar-borrador-candidato";

const fakeDraft = {
  fullName: null,
  email: null,
  phone: null,
  headline: "Frontend Senior",
  location: null,
  linkedinUrl: null,
  summary: "Resumen",
  skills: [],
  workExperiences: [],
  education: [],
  certifications: [],
};

const ctx = { organizationId: "org-1", role: "recruiter" as const };

describe("generarBorradorCandidato", () => {
  it("rechaza sin sesión/organization", async () => {
    const deps = { draftProfile: vi.fn() };
    const res = await generarBorradorCandidato(
      { cvText: "cv" },
      { organizationId: null, role: null },
      deps,
    );
    expect(res.ok).toBe(false);
    expect(deps.draftProfile).not.toHaveBeenCalled();
  });

  it("rechaza a un rol sin candidates.manage", async () => {
    const deps = { draftProfile: vi.fn() };
    const res = await generarBorradorCandidato(
      { cvText: "cv" },
      { ...ctx, role: "viewer" },
      deps,
    );
    expect(res.ok).toBe(false);
    expect(deps.draftProfile).not.toHaveBeenCalled();
  });

  it("rechaza si no viene ninguna fuente", async () => {
    const deps = { draftProfile: vi.fn() };
    const res = await generarBorradorCandidato({}, ctx, deps);
    expect(res.ok).toBe(false);
    expect(deps.draftProfile).not.toHaveBeenCalled();
  });

  it("acepta un CV en PDF y devuelve el borrador", async () => {
    const deps = { draftProfile: vi.fn().mockResolvedValue(fakeDraft) };
    const input = {
      cvFile: { base64: "abc", mimeType: "application/pdf" as const },
    };
    const res = await generarBorradorCandidato(input, ctx, deps);
    expect(res).toEqual({ ok: true, data: fakeDraft });
    expect(deps.draftProfile).toHaveBeenCalledWith(input);
  });

  it("acepta texto de CV ya extraído (.docx / PDF con texto)", async () => {
    const deps = { draftProfile: vi.fn().mockResolvedValue(fakeDraft) };
    const res = await generarBorradorCandidato(
      { cvText: "Juan Perez\nExperiencia..." },
      ctx,
      deps,
    );
    expect(res.ok).toBe(true);
  });
});

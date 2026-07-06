import { describe, it, expect, vi } from "vitest";
import { generarPerfilConIa } from "./generar-perfil-con-ia";

const fakeDraft = {
  headline: "Frontend Senior",
  location: null,
  linkedinUrl: null,
  summary: "Resumen",
  skills: [],
  workExperiences: [],
  education: [],
  certifications: [],
};

describe("generarPerfilConIa", () => {
  it("rechaza si no hay usuario autenticado", async () => {
    const deps = { draftProfile: vi.fn() };
    const res = await generarPerfilConIa({ linkedinUrl: "https://linkedin.com/in/x" }, { userId: null }, deps);
    expect(res.ok).toBe(false);
    expect(deps.draftProfile).not.toHaveBeenCalled();
  });

  it("rechaza si no viene ni linkedinUrl ni cvFile", async () => {
    const deps = { draftProfile: vi.fn() };
    const res = await generarPerfilConIa({}, { userId: "user-1" }, deps);
    expect(res.ok).toBe(false);
    expect(deps.draftProfile).not.toHaveBeenCalled();
  });

  it("acepta solo linkedinUrl", async () => {
    const deps = { draftProfile: vi.fn().mockResolvedValue(fakeDraft) };
    const input = { linkedinUrl: "https://linkedin.com/in/x" };
    const res = await generarPerfilConIa(input, { userId: "user-1" }, deps);
    expect(res).toEqual({ ok: true, data: fakeDraft });
    expect(deps.draftProfile).toHaveBeenCalledWith(input);
  });

  it("acepta solo cvFile", async () => {
    const deps = { draftProfile: vi.fn().mockResolvedValue(fakeDraft) };
    const input = { cvFile: { base64: "abc", mimeType: "application/pdf" as const } };
    const res = await generarPerfilConIa(input, { userId: "user-1" }, deps);
    expect(res.ok).toBe(true);
    expect(deps.draftProfile).toHaveBeenCalledWith(input);
  });

  it("acepta ambos a la vez", async () => {
    const deps = { draftProfile: vi.fn().mockResolvedValue(fakeDraft) };
    const input = {
      linkedinUrl: "https://linkedin.com/in/x",
      cvFile: { base64: "abc", mimeType: "application/pdf" as const },
    };
    const res = await generarPerfilConIa(input, { userId: "user-1" }, deps);
    expect(res.ok).toBe(true);
  });
});

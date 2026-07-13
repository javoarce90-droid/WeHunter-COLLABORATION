import { describe, it, expect, vi } from "vitest";
import { completarOnboardingConIa } from "./completar-onboarding-con-ia";

const baseInput = {
  fullName: "Ale López",
  workExperiences: [],
  education: [],
  certifications: [],
};

describe("completarOnboardingConIa", () => {
  it("rechaza si no hay usuario autenticado", async () => {
    const deps = { persistDraft: vi.fn() };
    const res = await completarOnboardingConIa(baseInput, { userId: null }, deps);
    expect(res.ok).toBe(false);
    expect(deps.persistDraft).not.toHaveBeenCalled();
  });

  it("rechaza si el nombre es muy corto", async () => {
    const deps = { persistDraft: vi.fn() };
    const res = await completarOnboardingConIa(
      { ...baseInput, fullName: "A" },
      { userId: "user-1" },
      deps,
    );
    expect(res.ok).toBe(false);
    expect(deps.persistDraft).not.toHaveBeenCalled();
  });

  it("normaliza y persiste el perfil con arrays vacíos", async () => {
    const deps = { persistDraft: vi.fn().mockResolvedValue(undefined) };
    const res = await completarOnboardingConIa(
      { ...baseInput, skills: "React, Node" },
      { userId: "user-1" },
      deps,
    );
    expect(res).toEqual({ ok: true, data: { userId: "user-1" } });
    expect(deps.persistDraft).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        profile: expect.objectContaining({ fullName: "Ale López", skills: ["React", "Node"] }),
        workExperiences: [],
        education: [],
        certifications: [],
      }),
    );
  });

  it("normaliza cada experiencia/educación/certificación y las manda al deps", async () => {
    const deps = { persistDraft: vi.fn().mockResolvedValue(undefined) };
    const res = await completarOnboardingConIa(
      {
        ...baseInput,
        workExperiences: [{ company: " Acme ", position: " Dev ", skills: ["React", "Node"] }],
        education: [{ institution: " UBA ", degree: " Ingeniería " }],
        certifications: [{ name: " AWS Certified " }],
      },
      { userId: "user-1" },
      deps,
    );
    expect(res.ok).toBe(true);
    expect(deps.persistDraft).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        workExperiences: [expect.objectContaining({ company: "Acme", position: "Dev", skills: ["React", "Node"] })],
        education: [expect.objectContaining({ institution: "UBA", degree: "Ingeniería" })],
        certifications: [{ name: "AWS Certified", url: null }],
      }),
    );
  });

  it("rechaza si una experiencia del borrador es inválida (sin company)", async () => {
    const deps = { persistDraft: vi.fn() };
    const res = await completarOnboardingConIa(
      { ...baseInput, workExperiences: [{ company: " ", position: "Dev" }] },
      { userId: "user-1" },
      deps,
    );
    expect(res.ok).toBe(false);
    expect(deps.persistDraft).not.toHaveBeenCalled();
  });
});

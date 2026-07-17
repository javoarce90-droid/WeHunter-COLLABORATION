import { describe, it, expect, vi } from "vitest";
import { agregarIdioma, eliminarIdioma, normalizeIdioma } from "./gestionar-idioma";

const owner = { kind: "profile" as const, profileId: "candidate-1" };

describe("normalizeIdioma", () => {
  it("rechaza si falta el idioma", () => {
    expect(normalizeIdioma({ language: " ", level: "basico" }).ok).toBe(false);
  });

  it("rechaza un nivel fuera del enum", () => {
    expect(normalizeIdioma({ language: "Inglés", level: "fluido" }).ok).toBe(false);
  });

  it("normaliza un idioma válido", () => {
    expect(normalizeIdioma({ language: " Inglés ", level: "avanzado" })).toEqual({
      ok: true,
      data: { language: "Inglés", level: "avanzado" },
    });
  });
});

describe("agregarIdioma", () => {
  it("no persiste si la validación falla", async () => {
    const deps = { insertLanguage: vi.fn() };
    const res = await agregarIdioma({ language: " ", level: "basico" }, owner, deps);
    expect(res.ok).toBe(false);
    expect(deps.insertLanguage).not.toHaveBeenCalled();
  });

  it("normaliza y persiste un idioma válido", async () => {
    const deps = { insertLanguage: vi.fn().mockResolvedValue({ id: "lang-1" }) };
    const res = await agregarIdioma({ language: " Inglés ", level: "nativo" }, owner, deps);
    expect(res).toEqual({ ok: true, data: { id: "lang-1" } });
    expect(deps.insertLanguage).toHaveBeenCalledWith(owner, { language: "Inglés", level: "nativo" });
  });
});

describe("eliminarIdioma", () => {
  it("devuelve error si no se encontró/no pertenece", async () => {
    const deps = { deleteLanguage: vi.fn().mockResolvedValue(false) };
    expect((await eliminarIdioma("lang-1", owner, deps)).ok).toBe(false);
  });

  it("elimina cuando existe y pertenece", async () => {
    const deps = { deleteLanguage: vi.fn().mockResolvedValue(true) };
    expect(await eliminarIdioma("lang-1", owner, deps)).toEqual({ ok: true, data: { id: "lang-1" } });
  });
});

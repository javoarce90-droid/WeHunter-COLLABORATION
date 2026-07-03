import { describe, it, expect, vi } from "vitest";
import { generarPerfilConIa } from "./generar-perfil-con-ia";

const draft = {
  headline: "Frontend Senior",
  location: "Buenos Aires",
  linkedinUrl: null,
  summary: "Desarrollador con 5 años de experiencia.",
  skills: ["react", "node"],
};

describe("generarPerfilConIa", () => {
  it("rechaza si no hay usuario autenticado", async () => {
    const deps = { draftProfile: vi.fn() };
    const res = await generarPerfilConIa({ rawText: "texto largo".repeat(5) }, { userId: null }, deps);
    expect(res.ok).toBe(false);
  });

  it("rechaza texto demasiado corto", async () => {
    const deps = { draftProfile: vi.fn() };
    const res = await generarPerfilConIa({ rawText: "corto" }, { userId: "candidate-1" }, deps);
    expect(res.ok).toBe(false);
    expect(deps.draftProfile).not.toHaveBeenCalled();
  });

  it("devuelve el borrador generado por IA", async () => {
    const deps = { draftProfile: vi.fn().mockResolvedValue(draft) };
    const rawText = "Desarrollador frontend con experiencia en React y Node, Buenos Aires.";
    const res = await generarPerfilConIa({ rawText }, { userId: "candidate-1" }, deps);
    expect(res).toEqual({ ok: true, data: draft });
    expect(deps.draftProfile).toHaveBeenCalledWith(rawText);
  });
});

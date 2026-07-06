import { describe, it, expect, vi } from "vitest";
import {
  agregarExperiencia,
  editarExperiencia,
  eliminarExperiencia,
  normalizeExperiencia,
} from "./gestionar-experiencia";

const owner = { kind: "profile" as const, profileId: "candidate-1" };

describe("agregarExperiencia", () => {
  it("rechaza si falta la empresa", async () => {
    const deps = { insertExperience: vi.fn() };
    const res = await agregarExperiencia({ company: " ", position: "Dev" }, owner, deps);
    expect(res.ok).toBe(false);
    expect(deps.insertExperience).not.toHaveBeenCalled();
  });

  it("rechaza si falta el puesto", async () => {
    const deps = { insertExperience: vi.fn() };
    const res = await agregarExperiencia({ company: "Acme", position: " " }, owner, deps);
    expect(res.ok).toBe(false);
  });

  it("normaliza y persiste una experiencia válida", async () => {
    const deps = { insertExperience: vi.fn().mockResolvedValue({ id: "exp-1" }) };
    const res = await agregarExperiencia(
      { company: " Acme ", position: " Dev ", startDate: "2024-01-01" },
      owner,
      deps,
    );
    expect(res).toEqual({ ok: true, data: { id: "exp-1" } });
    expect(deps.insertExperience).toHaveBeenCalledWith(
      owner,
      expect.objectContaining({ company: "Acme", position: "Dev", startDate: "2024-01-01" }),
    );
  });

  it("normaliza los skills separados por coma y descarta duplicados/vacíos", async () => {
    const deps = { insertExperience: vi.fn().mockResolvedValue({ id: "exp-1" }) };
    const res = await agregarExperiencia(
      { company: "Acme", position: "Dev", skills: "React, Node, react, " },
      owner,
      deps,
    );
    expect(res.ok).toBe(true);
    expect(deps.insertExperience).toHaveBeenCalledWith(
      owner,
      expect.objectContaining({ skills: ["React", "Node", "react"] }),
    );
  });

  it("skills queda null si no se manda", async () => {
    const deps = { insertExperience: vi.fn().mockResolvedValue({ id: "exp-1" }) };
    await agregarExperiencia({ company: "Acme", position: "Dev" }, owner, deps);
    expect(deps.insertExperience).toHaveBeenCalledWith(owner, expect.objectContaining({ skills: null }));
  });
});

describe("normalizeExperiencia (reusada por el onboarding con IA)", () => {
  it("está exportada y valida igual que antes", () => {
    const res = normalizeExperiencia({ company: " Acme ", position: " Dev " });
    expect(res).toEqual({
      ok: true,
      data: expect.objectContaining({ company: "Acme", position: "Dev" }),
    });
  });

  it("rechaza sin company/position", () => {
    expect(normalizeExperiencia({ company: " ", position: "Dev" }).ok).toBe(false);
  });
});

describe("editarExperiencia", () => {
  it("devuelve error si no se encontró/no pertenece", async () => {
    const deps = { updateExperience: vi.fn().mockResolvedValue(false) };
    const res = await editarExperiencia("exp-1", { company: "Acme", position: "Dev" }, owner, deps);
    expect(res.ok).toBe(false);
  });

  it("actualiza cuando existe y pertenece", async () => {
    const deps = { updateExperience: vi.fn().mockResolvedValue(true) };
    const res = await editarExperiencia("exp-1", { company: "Acme", position: "Dev" }, owner, deps);
    expect(res).toEqual({ ok: true, data: { id: "exp-1" } });
  });
});

describe("eliminarExperiencia", () => {
  it("devuelve error si no se encontró/no pertenece", async () => {
    const deps = { deleteExperience: vi.fn().mockResolvedValue(false) };
    const res = await eliminarExperiencia("exp-1", owner, deps);
    expect(res.ok).toBe(false);
  });

  it("elimina cuando existe y pertenece", async () => {
    const deps = { deleteExperience: vi.fn().mockResolvedValue(true) };
    const res = await eliminarExperiencia("exp-1", owner, deps);
    expect(res).toEqual({ ok: true, data: { id: "exp-1" } });
  });
});

import { describe, it, expect, vi } from "vitest";
import { agregarExperiencia, editarExperiencia, eliminarExperiencia } from "./gestionar-experiencia";

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

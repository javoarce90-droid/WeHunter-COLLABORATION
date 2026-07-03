import { describe, it, expect, vi } from "vitest";
import { agregarEducacion, editarEducacion, eliminarEducacion } from "./gestionar-educacion";

const owner = { kind: "profile" as const, profileId: "candidate-1" };

describe("agregarEducacion", () => {
  it("rechaza si falta la institución", async () => {
    const deps = { insertEducation: vi.fn() };
    const res = await agregarEducacion({ institution: " ", degree: "Ingeniería" }, owner, deps);
    expect(res.ok).toBe(false);
    expect(deps.insertEducation).not.toHaveBeenCalled();
  });

  it("rechaza si falta el título/carrera", async () => {
    const deps = { insertEducation: vi.fn() };
    const res = await agregarEducacion({ institution: "UBA", degree: " " }, owner, deps);
    expect(res.ok).toBe(false);
  });

  it("normaliza y persiste una educación válida", async () => {
    const deps = { insertEducation: vi.fn().mockResolvedValue({ id: "edu-1" }) };
    const res = await agregarEducacion({ institution: " UBA ", degree: " Ingeniería " }, owner, deps);
    expect(res).toEqual({ ok: true, data: { id: "edu-1" } });
    expect(deps.insertEducation).toHaveBeenCalledWith(
      owner,
      expect.objectContaining({ institution: "UBA", degree: "Ingeniería" }),
    );
  });
});

describe("editarEducacion", () => {
  it("devuelve error si no se encontró/no pertenece", async () => {
    const deps = { updateEducation: vi.fn().mockResolvedValue(false) };
    const res = await editarEducacion("edu-1", { institution: "UBA", degree: "Ingeniería" }, owner, deps);
    expect(res.ok).toBe(false);
  });

  it("actualiza cuando existe y pertenece", async () => {
    const deps = { updateEducation: vi.fn().mockResolvedValue(true) };
    const res = await editarEducacion("edu-1", { institution: "UBA", degree: "Ingeniería" }, owner, deps);
    expect(res).toEqual({ ok: true, data: { id: "edu-1" } });
  });
});

describe("eliminarEducacion", () => {
  it("devuelve error si no se encontró/no pertenece", async () => {
    const deps = { deleteEducation: vi.fn().mockResolvedValue(false) };
    const res = await eliminarEducacion("edu-1", owner, deps);
    expect(res.ok).toBe(false);
  });

  it("elimina cuando existe y pertenece", async () => {
    const deps = { deleteEducation: vi.fn().mockResolvedValue(true) };
    const res = await eliminarEducacion("edu-1", owner, deps);
    expect(res).toEqual({ ok: true, data: { id: "edu-1" } });
  });
});

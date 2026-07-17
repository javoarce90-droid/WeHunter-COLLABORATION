import { describe, it, expect, vi } from "vitest";
import { sugerirSolicitud } from "./sugerir-solicitud";
import type { SugerirSolicitudDeps } from "./sugerir-solicitud";

const draft = {
  position: "Analista de datos",
  jobArea: "data",
  skills: ["sql", "python"],
  objectives: "Objetivos generados",
  requirements: "Requisitos generados",
  responsibilities: "Responsabilidades generadas",
};

const makeDeps = (overrides?: Partial<SugerirSolicitudDeps>): SugerirSolicitudDeps => ({
  tokenEsValido: vi.fn().mockResolvedValue(true),
  generarBorrador: vi.fn().mockResolvedValue(draft),
  esAreaValida: vi.fn().mockReturnValue(true),
  ...overrides,
});

const input = {
  token: "tok_abc",
  title: "Data Analyst Senior",
  brief: "analista para el equipo de growth",
};

describe("sugerirSolicitud", () => {
  it("devuelve el borrador y le pasa al modelo los campos que ya cargó el cliente", async () => {
    const deps = makeDeps();
    const result = await sugerirSolicitud(
      { ...input, modality: "hybrid", seniority: "senior", employmentType: "full_time" },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.objectives).toBe("Objetivos generados");
    expect(deps.generarBorrador).toHaveBeenCalledWith({
      name: "Data Analyst Senior",
      brief: "analista para el equipo de growth",
      modality: "hybrid",
      seniority: "senior",
      workDay: "full_time",
    });
  });

  it("descarta un área que no está en el catálogo", async () => {
    const deps = makeDeps({ esAreaValida: vi.fn().mockReturnValue(false) });
    const result = await sugerirSolicitud(input, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.jobArea).toBeNull();
  });

  it("limpia las skills en blanco que devuelva el modelo", async () => {
    const deps = makeDeps({
      generarBorrador: vi.fn().mockResolvedValue({ ...draft, skills: [" sql ", "", "  "] }),
    });
    const result = await sugerirSolicitud(input, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.skills).toEqual(["sql"]);
  });

  it("no llama al modelo si el token no es válido", async () => {
    const deps = makeDeps({ tokenEsValido: vi.fn().mockResolvedValue(false) });
    const result = await sugerirSolicitud(input, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/vencido/i);
    expect(deps.generarBorrador).not.toHaveBeenCalled();
  });

  it("no llama al modelo si falta el token", async () => {
    const deps = makeDeps();
    const result = await sugerirSolicitud({ ...input, token: "" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/inválido/i);
    expect(deps.tokenEsValido).not.toHaveBeenCalled();
    expect(deps.generarBorrador).not.toHaveBeenCalled();
  });

  it("no llama al modelo si el título es demasiado corto", async () => {
    const deps = makeDeps();
    const result = await sugerirSolicitud({ ...input, title: "QA" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/título/i);
    expect(deps.generarBorrador).not.toHaveBeenCalled();
  });

  it("no llama al modelo si el brief viene vacío", async () => {
    const deps = makeDeps();
    const result = await sugerirSolicitud({ ...input, brief: "   " }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/necesitás/i);
    expect(deps.generarBorrador).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from "vitest";
import { definirPreguntasScreening } from "./definir-preguntas-screening";
import type { DefinirPreguntasScreeningDeps, ScreeningQuestionInput } from "./definir-preguntas-screening";

const ctx = { organizationId: "org-1", role: "recruiter" as const };
const deps = (overrides: Partial<DefinirPreguntasScreeningDeps> = {}): DefinirPreguntasScreeningDeps => ({
  getJob: vi.fn().mockResolvedValue({ id: "job-1" }),
  syncQuestions: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const yesNo: ScreeningQuestionInput = { type: "yes_no", label: "¿Tenés visa?", required: true };

describe("definirPreguntasScreening", () => {
  it("rechaza sin organization/rol", async () => {
    const d = deps();
    const res = await definirPreguntasScreening("job-1", [yesNo], { organizationId: null, role: null }, d);
    expect(res.ok).toBe(false);
    expect(d.syncQuestions).not.toHaveBeenCalled();
  });

  it("rechaza al consultor", async () => {
    const d = deps();
    const res = await definirPreguntasScreening("job-1", [yesNo], { ...ctx, role: "consultant" }, d);
    expect(res.ok).toBe(false);
    expect(d.syncQuestions).not.toHaveBeenCalled();
  });

  it("rechaza si la búsqueda no pertenece a la org", async () => {
    const d = deps({ getJob: vi.fn().mockResolvedValue(null) });
    const res = await definirPreguntasScreening("job-1", [yesNo], ctx, d);
    expect(res.ok).toBe(false);
    expect(d.syncQuestions).not.toHaveBeenCalled();
  });

  it("rechaza más de 20 preguntas", async () => {
    const d = deps();
    const many = Array.from({ length: 21 }, (_, i) => ({ ...yesNo, label: `Pregunta ${i}` }));
    const res = await definirPreguntasScreening("job-1", many, ctx, d);
    expect(res.ok).toBe(false);
    expect(d.syncQuestions).not.toHaveBeenCalled();
  });

  it("descarta en silencio preguntas con label vacío", async () => {
    const d = deps();
    const res = await definirPreguntasScreening(
      "job-1",
      [yesNo, { type: "text", label: "   ", required: false }],
      ctx,
      d,
    );
    expect(res.ok).toBe(true);
    expect(d.syncQuestions).toHaveBeenCalledWith(
      "job-1",
      "org-1",
      [{ id: undefined, type: "yes_no", label: "¿Tenés visa?", options: null, required: true, position: 0 }],
    );
  });

  it("rechaza opción múltiple con menos de 2 opciones", async () => {
    const d = deps();
    const res = await definirPreguntasScreening(
      "job-1",
      [{ type: "multiple_choice", label: "Modalidad preferida", required: true, options: ["Remoto"] }],
      ctx,
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.syncQuestions).not.toHaveBeenCalled();
  });

  it("normaliza opción múltiple, filtrando opciones vacías, y preserva el id existente", async () => {
    const d = deps();
    const res = await definirPreguntasScreening(
      "job-1",
      [
        {
          id: "q-1",
          type: "multiple_choice",
          label: "Modalidad preferida",
          required: true,
          options: ["Remoto", "  ", "Híbrido"],
        },
      ],
      ctx,
      d,
    );
    expect(res.ok).toBe(true);
    expect(d.syncQuestions).toHaveBeenCalledWith("job-1", "org-1", [
      {
        id: "q-1",
        type: "multiple_choice",
        label: "Modalidad preferida",
        options: ["Remoto", "Híbrido"],
        required: true,
        position: 0,
      },
    ]);
  });

  it("asigna la posición según el orden recibido", async () => {
    const d = deps();
    await definirPreguntasScreening(
      "job-1",
      [
        { type: "text", label: "Primera", required: false },
        { type: "number", label: "Segunda", required: false },
      ],
      ctx,
      d,
    );
    const [, , sent] = (d.syncQuestions as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(sent.map((q: { position: number }) => q.position)).toEqual([0, 1]);
  });
});

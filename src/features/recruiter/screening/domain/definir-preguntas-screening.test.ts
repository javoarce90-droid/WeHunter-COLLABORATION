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
      [
        {
          id: undefined,
          type: "yes_no",
          label: "¿Tenés visa?",
          options: null,
          required: true,
          position: 0,
          isCriterion: false,
          expectedValues: null,
          minValue: null,
          maxValue: null,
        },
      ],
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
        isCriterion: false,
        expectedValues: null,
        minValue: null,
        maxValue: null,
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

describe("definirPreguntasScreening — criterios de preselección", () => {
  const guardadas = (d: DefinirPreguntasScreeningDeps) =>
    (d.syncQuestions as ReturnType<typeof vi.fn>).mock.calls[0][2];

  it("normaliza una pregunta que no es criterio", async () => {
    const d = deps();
    await definirPreguntasScreening("job-1", [yesNo], ctx, d);
    expect(guardadas(d)[0]).toMatchObject({
      isCriterion: false,
      expectedValues: null,
      minValue: null,
      maxValue: null,
    });
  });

  it("guarda la respuesta esperada de un sí/no", async () => {
    const d = deps();
    await definirPreguntasScreening(
      "job-1",
      [{ ...yesNo, isCriterion: true, expectedValues: ["Sí"] }],
      ctx,
      d,
    );
    expect(guardadas(d)[0]).toMatchObject({ isCriterion: true, expectedValues: ["Sí"] });
  });

  it("rechaza un criterio sin respuesta esperada", async () => {
    const d = deps();
    const res = await definirPreguntasScreening("job-1", [{ ...yesNo, isCriterion: true }], ctx, d);
    expect(res.ok).toBe(false);
    expect(d.syncQuestions).not.toHaveBeenCalled();
  });

  it("no permite que una pregunta de texto sea criterio", async () => {
    const d = deps();
    const res = await definirPreguntasScreening(
      "job-1",
      [{ type: "text", label: "Contanos de vos", required: true, isCriterion: true }],
      ctx,
      d,
    );
    expect(res.ok).toBe(false);
  });

  it("rechaza una respuesta esperada que no está entre las opciones", async () => {
    const d = deps();
    const res = await definirPreguntasScreening(
      "job-1",
      [
        {
          type: "multiple_choice",
          label: "Nivel de inglés",
          required: true,
          options: ["Básico", "Intermedio"],
          isCriterion: true,
          expectedValues: ["Avanzado"],
        },
      ],
      ctx,
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.syncQuestions).not.toHaveBeenCalled();
  });

  it("acepta varias opciones válidas como criterio", async () => {
    const d = deps();
    const res = await definirPreguntasScreening(
      "job-1",
      [
        {
          type: "multiple_choice",
          label: "Nivel de inglés",
          required: true,
          options: ["Básico", "Intermedio", "Avanzado"],
          isCriterion: true,
          expectedValues: ["Intermedio", "Avanzado"],
        },
      ],
      ctx,
      d,
    );
    expect(res.ok).toBe(true);
    expect(guardadas(d)[0].expectedValues).toEqual(["Intermedio", "Avanzado"]);
  });

  it("exige al menos un límite en un criterio numérico", async () => {
    const d = deps();
    const res = await definirPreguntasScreening(
      "job-1",
      [{ type: "number", label: "Años de experiencia", required: true, isCriterion: true }],
      ctx,
      d,
    );
    expect(res.ok).toBe(false);
  });

  it("rechaza un rango numérico invertido", async () => {
    const d = deps();
    const res = await definirPreguntasScreening(
      "job-1",
      [
        {
          type: "number",
          label: "Años de experiencia",
          required: true,
          isCriterion: true,
          minValue: 10,
          maxValue: 3,
        },
      ],
      ctx,
      d,
    );
    expect(res.ok).toBe(false);
  });

  it("guarda el rango numérico válido", async () => {
    const d = deps();
    await definirPreguntasScreening(
      "job-1",
      [
        {
          type: "number",
          label: "Años de experiencia",
          required: true,
          isCriterion: true,
          minValue: 3,
        },
      ],
      ctx,
      d,
    );
    expect(guardadas(d)[0]).toMatchObject({ isCriterion: true, minValue: 3, maxValue: null });
  });
});

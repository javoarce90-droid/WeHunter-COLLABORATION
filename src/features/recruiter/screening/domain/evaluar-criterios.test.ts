import { describe, it, expect } from "vitest";
import { evaluarCriterios } from "./evaluar-criterios";
import type { CriterionQuestion } from "./evaluar-criterios";

const makeQuestion = (overrides?: Partial<CriterionQuestion>): CriterionQuestion => ({
  id: "q-1",
  type: "yes_no",
  label: "¿Tenés disponibilidad para viajar?",
  isCriterion: true,
  expectedValues: ["Sí"],
  minValue: null,
  maxValue: null,
  ...overrides,
});

describe("evaluarCriterios", () => {
  it("ignora las preguntas que no son criterio", () => {
    const res = evaluarCriterios(
      [makeQuestion(), makeQuestion({ id: "q-2", isCriterion: false })],
      { "q-1": "Sí", "q-2": "cualquier cosa" },
    );
    expect(res.total).toBe(1);
    expect(res.cumplidos).toBe(1);
  });

  it("cuenta cumplidos sobre el total de criterios", () => {
    const res = evaluarCriterios(
      [
        makeQuestion(),
        makeQuestion({ id: "q-2", expectedValues: ["No"] }),
        makeQuestion({ id: "q-3" }),
      ],
      { "q-1": "Sí", "q-2": "Sí", "q-3": "Sí" },
    );
    expect(res.cumplidos).toBe(2);
    expect(res.total).toBe(3);
  });

  it("compara sin distinguir mayúsculas ni acentos", () => {
    const res = evaluarCriterios([makeQuestion()], { "q-1": "si" });
    expect(res.cumplidos).toBe(1);
  });

  it("no cumple si la pregunta quedó sin responder", () => {
    const res = evaluarCriterios([makeQuestion()], {});
    expect(res.cumplidos).toBe(0);
    expect(res.detalle[0]).toMatchObject({ answer: null, cumple: false });
  });

  it("no cumple si la respuesta está en blanco", () => {
    const res = evaluarCriterios([makeQuestion()], { "q-1": "   " });
    expect(res.cumplidos).toBe(0);
  });

  it("acepta cualquiera de las opciones válidas en opción múltiple", () => {
    const q = makeQuestion({
      type: "multiple_choice",
      expectedValues: ["Avanzado", "Bilingüe"],
    });
    expect(evaluarCriterios([q], { "q-1": "Bilingüe" }).cumplidos).toBe(1);
    expect(evaluarCriterios([q], { "q-1": "Intermedio" }).cumplidos).toBe(0);
  });

  describe("criterios numéricos", () => {
    const numerica = (overrides?: Partial<CriterionQuestion>) =>
      makeQuestion({
        type: "number",
        label: "¿Cuántos años de experiencia tenés?",
        expectedValues: null,
        minValue: 3,
        ...overrides,
      });

    it("cumple dentro del rango y falla fuera", () => {
      expect(evaluarCriterios([numerica()], { "q-1": "5" }).cumplidos).toBe(1);
      expect(evaluarCriterios([numerica()], { "q-1": "2" }).cumplidos).toBe(0);
    });

    it("respeta el máximo", () => {
      const q = numerica({ minValue: null, maxValue: 100 });
      expect(evaluarCriterios([q], { "q-1": "80" }).cumplidos).toBe(1);
      expect(evaluarCriterios([q], { "q-1": "120" }).cumplidos).toBe(0);
    });

    it("acepta decimales con coma", () => {
      expect(evaluarCriterios([numerica()], { "q-1": "3,5" }).cumplidos).toBe(1);
    });

    it("no cumple si la respuesta no es un número", () => {
      expect(evaluarCriterios([numerica()], { "q-1": "bastantes" }).cumplidos).toBe(0);
    });

    it("no cumple si el criterio no tiene ningún límite cargado", () => {
      const q = numerica({ minValue: null, maxValue: null });
      expect(evaluarCriterios([q], { "q-1": "5" }).cumplidos).toBe(0);
    });
  });

  it("devuelve total 0 cuando el aviso no definió criterios", () => {
    const res = evaluarCriterios([makeQuestion({ isCriterion: false })], { "q-1": "Sí" });
    expect(res).toEqual({ cumplidos: 0, total: 0, detalle: [] });
  });
});

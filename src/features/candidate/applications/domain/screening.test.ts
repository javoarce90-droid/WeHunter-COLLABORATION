import { describe, it, expect } from "vitest";
import { obligatoriasSinResponder } from "./screening";
import type { ScreeningQuestion } from "./screening";

const q = (over: Partial<ScreeningQuestion> & { id: string }): ScreeningQuestion => ({
  type: "text",
  label: `Pregunta ${over.id}`,
  options: null,
  required: true,
  ...over,
});

describe("obligatoriasSinResponder", () => {
  it("no devuelve nada si todas las obligatorias están respondidas", () => {
    const questions = [q({ id: "a" }), q({ id: "b" })];
    expect(obligatoriasSinResponder(questions, { a: "Sí", b: "3" })).toEqual([]);
  });

  it("devuelve las obligatorias sin respuesta", () => {
    const questions = [q({ id: "a" }), q({ id: "b" })];
    const faltan = obligatoriasSinResponder(questions, { a: "Sí" });
    expect(faltan.map((x) => x.id)).toEqual(["b"]);
  });

  it("trata una respuesta en blanco como sin responder", () => {
    const questions = [q({ id: "a" })];
    expect(obligatoriasSinResponder(questions, { a: "   " }).map((x) => x.id)).toEqual(["a"]);
  });

  it("ignora las opcionales sin responder", () => {
    const questions = [q({ id: "a", required: false }), q({ id: "b" })];
    expect(obligatoriasSinResponder(questions, { b: "ok" })).toEqual([]);
  });

  it("sin preguntas, no falta nada", () => {
    expect(obligatoriasSinResponder([], {})).toEqual([]);
  });
});

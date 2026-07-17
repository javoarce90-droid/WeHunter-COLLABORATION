"use client";

import type { ScreeningQuestion } from "../domain/screening";

/**
 * Campos de las preguntas de screening. Extraído para que los dos flujos de postulación
 * (Career Site `ApplyForm` y portal `ApplicationModal`) rendericen exactamente lo mismo —
 * antes vivía solo en ApplyForm y el portal no las mostraba.
 *
 * Es controlado: el padre decide qué hace con las respuestas (mandarlas en un hidden,
 * validarlas antes de avanzar de paso, etc.).
 */
export function ScreeningQuestionFields({
  questions,
  answers,
  onChange,
  disabled,
  fieldClass,
}: {
  questions: ScreeningQuestion[];
  answers: Record<string, string>;
  onChange: (questionId: string, value: string) => void;
  disabled?: boolean;
  fieldClass: string;
}) {
  return (
    <>
      {questions.map((q) => (
        <div key={q.id} className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">
            {q.label}
            {q.required && <span className="text-danger"> *</span>}
          </label>

          {q.type === "yes_no" && (
            <div className="flex gap-4">
              {["Sí", "No"].map((opt) => (
                <label key={opt} className="flex items-center gap-1.5 text-sm text-text">
                  <input
                    type="radio"
                    name={`screening-${q.id}`}
                    disabled={disabled}
                    checked={answers[q.id] === opt}
                    onChange={() => onChange(q.id, opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}

          {q.type === "text" && (
            <textarea
              rows={2}
              maxLength={500}
              disabled={disabled}
              value={answers[q.id] ?? ""}
              onChange={(e) => onChange(q.id, e.target.value)}
              className={fieldClass}
            />
          )}

          {q.type === "number" && (
            <input
              type="number"
              disabled={disabled}
              value={answers[q.id] ?? ""}
              onChange={(e) => onChange(q.id, e.target.value)}
              className={fieldClass}
            />
          )}

          {q.type === "multiple_choice" && (
            <select
              disabled={disabled}
              value={answers[q.id] ?? ""}
              onChange={(e) => onChange(q.id, e.target.value)}
              className={fieldClass}
            >
              <option value="">Elegí una opción</option>
              {(q.options ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </>
  );
}

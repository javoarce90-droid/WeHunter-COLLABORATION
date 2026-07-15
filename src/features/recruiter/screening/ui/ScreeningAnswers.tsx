import type { ScreeningAnswerRow } from "../data/screening.queries";

/** Respuestas de screening de una postulación puntual. Solo lectura — el recruiter no las
 * edita, son lo que contestó el candidato al postularse. */
export function ScreeningAnswers({ answers }: { answers: ScreeningAnswerRow[] }) {
  if (answers.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-label">
        Respuestas de screening
      </p>
      <div className="flex flex-col gap-3">
        {answers.map((a) => (
          <div key={a.questionId} className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-muted">{a.questionLabel}</span>
            <span className="text-sm text-text">{a.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

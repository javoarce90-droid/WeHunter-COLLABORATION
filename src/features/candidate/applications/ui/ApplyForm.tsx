"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postularAction, type PostularActionState } from "../actions";
import { accentStyle } from "@/features/candidate/career-site/ui/brand";
import type { CareerSiteJobDetail } from "@/features/candidate/career-site/data/career-site.data";

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

const initialState: PostularActionState = {};

export function ApplyForm({
  slug,
  job,
  defaultName,
  defaultEmail,
  defaultPhone,
  existingCvUrl,
  accentColor,
}: {
  slug: string;
  job: CareerSiteJobDetail;
  defaultName: string;
  defaultEmail: string;
  defaultPhone?: string;
  existingCvUrl?: string | null;
  accentColor?: string;
}) {
  const [state, formAction, pending] = useActionState(postularAction, initialState);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const questions = job.screeningQuestions ?? [];
  const answersPayload = JSON.stringify(
    Object.entries(answers)
      .filter(([, value]) => value.trim())
      .map(([questionId, value]) => ({ questionId, value })),
  );

  if (state.ok) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-6 text-center shadow-[var(--shadow)]">
        <p className="text-sm font-semibold text-text">¡Listo! Tu postulación fue enviada.</p>
        <p className="mt-1 text-xs text-muted">El equipo de reclutamiento la va a revisar pronto.</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow)]"
    >
      <input type="hidden" name="jobId" value={job.id} />
      <input type="hidden" name="slug" value={slug} />
      <h2 className="font-display text-base font-bold text-text">Postularme a {job.title}</h2>

      <Input label="Nombre completo" name="fullName" defaultValue={defaultName} required />
      <Input label="Email" name="email" type="email" defaultValue={defaultEmail} required />

      {defaultPhone ? (
        <input type="hidden" name="phone" value={defaultPhone} />
      ) : (
        <Input label="Teléfono (opcional)" name="phone" type="tel" />
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted">Mensaje (opcional)</label>
        <textarea name="coverNote" rows={4} maxLength={2000} className={fieldClass} />
      </div>

      {existingCvUrl ? (
        <input type="hidden" name="existingCvUrl" value={existingCvUrl} />
      ) : (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">CV (opcional)</label>
          <div className={fieldClass}>
            <input
              type="file"
              name="cv"
              accept=".pdf,.doc,.docx"
              className="w-full text-sm text-text file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-primary-light file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-hover"
            />
          </div>
          <span className="text-xs text-muted">PDF, DOC o DOCX · máx. 5 MB</span>
        </div>
      )}

      {questions.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
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
                        required={q.required}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
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
                  required={q.required}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  className={fieldClass}
                />
              )}

              {q.type === "number" && (
                <input
                  type="number"
                  required={q.required}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  className={fieldClass}
                />
              )}

              {q.type === "multiple_choice" && (
                <select
                  required={q.required}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  className={fieldClass}
                >
                  <option value="">Elegí una opción</option>
                  {(q.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
          <input type="hidden" name="screeningAnswers" value={answersPayload} />
        </div>
      )}

      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button
        type="submit"
        disabled={pending}
        style={accentStyle(accentColor)}
        className="hover:brightness-90"
      >
        {pending ? "Enviando…" : "Enviar postulación"}
      </Button>
    </form>
  );
}

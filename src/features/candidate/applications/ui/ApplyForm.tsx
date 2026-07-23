"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, fieldClasses } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { postularAction, type PostularActionState } from "../actions";
import { accentStyle } from "@/features/candidate/career-site/ui/brand";
import type { CareerSiteJobDetail } from "@/features/candidate/career-site/data/career-site.data";
import { ScreeningQuestionFields } from "./ScreeningQuestionFields";
import { obligatoriasSinResponder } from "../domain/screening";

// Base de campo compartida — la usa el wrapper del file input y ScreeningQuestionFields (prop).
const fieldClass = fieldClasses();

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
  const faltantes = obligatoriasSinResponder(questions, answers);
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

      <Textarea label="Mensaje (opcional)" name="coverNote" rows={4} maxLength={2000} />

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
          <ScreeningQuestionFields
            questions={questions}
            answers={answers}
            onChange={(id, value) => setAnswers((a) => ({ ...a, [id]: value }))}
            disabled={pending}
            fieldClass={fieldClass}
          />
          <input type="hidden" name="screeningAnswers" value={answersPayload} />
        </div>
      )}

      {faltantes.length > 0 && (
        <p className="text-xs text-muted">
          Falta responder: {faltantes.map((q) => q.label).join(", ")}.
        </p>
      )}

      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button
        type="submit"
        loading={pending}
        disabled={faltantes.length > 0}
        style={accentStyle(accentColor)}
        className="hover:brightness-90"
      >
        Enviar postulación
      </Button>
    </form>
  );
}

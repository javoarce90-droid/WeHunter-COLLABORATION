"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, fieldClasses } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  postularAction,
  postularAnonimoAction,
  type PostularActionState,
} from "../actions";
import { accentStyle } from "@/features/candidate/career-site/ui/brand";
import type { CareerSiteJobDetail } from "@/features/candidate/career-site/data/career-site.data";
import { ScreeningQuestionFields } from "./ScreeningQuestionFields";
import { obligatoriasSinResponder } from "../domain/screening";

// Base de campo compartida — la usa el wrapper del file input y ScreeningQuestionFields (prop).
const fieldClass = fieldClasses();

const initialState: PostularActionState = {};

// La CTA de envío hereda el color del workspace: fondo del accent (si hay) y, siempre, una
// tinta de texto legible sobre bg-primary — sin esto un workspace de color claro deja el
// botón en blanco sobre blanco.
function ctaStyle(accentColor?: string) {
  return { color: "var(--primary-contrast, #fff)", ...accentStyle(accentColor) };
}

export function ApplyForm({
  slug,
  job,
  defaultName,
  defaultEmail,
  defaultPhone,
  existingCvUrl,
  accentColor,
  mode = "auth",
}: {
  slug: string;
  job: CareerSiteJobDetail;
  defaultName: string;
  defaultEmail: string;
  defaultPhone?: string;
  existingCvUrl?: string | null;
  accentColor?: string;
  /** "anon" = visitante sin cuenta: pide nombre/email/teléfono/ubicación/CV en el form. */
  mode?: "auth" | "anon";
}) {
  const isAnon = mode === "anon";
  const [state, formAction, pending] = useActionState(
    isAnon ? postularAnonimoAction : postularAction,
    initialState,
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState(defaultName);
  const questions = job.screeningQuestions ?? [];
  const faltantes = obligatoriasSinResponder(questions, answers);
  const answersPayload = JSON.stringify(
    Object.entries(answers)
      .filter(([, value]) => value.trim())
      .map(([questionId, value]) => ({ questionId, value })),
  );

  if (state.ok) {
    if (!isAnon) {
      return (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-6 text-center shadow-[var(--shadow)]">
          <p className="text-sm font-semibold text-text">¡Listo! Tu postulación fue enviada.</p>
          <p className="mt-1 text-xs text-muted">El equipo de reclutamiento la va a revisar pronto.</p>
        </div>
      );
    }

    const registerHref =
      `/c/register?redirect=${encodeURIComponent(`/careers/${slug}`)}` +
      `&prefill_name=${encodeURIComponent(name)}&prefill_email=${encodeURIComponent(email)}`;

    return (
      <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
        <div className="p-6">
          <p className="font-display text-base font-bold tracking-[-0.01em] text-text">
            Postulación enviada
          </p>
          <p className="mt-1 text-sm text-muted">
            El equipo de reclutamiento de {job.title} va a revisar tu perfil. Si encaja, te
            contactan por email.
          </p>
        </div>
        <div className="border-t border-border bg-bg p-6">
          <p className="text-sm font-semibold text-text">Seguí el estado desde tu cuenta</p>
          <p className="mt-1 text-xs text-muted">
            Creá una cuenta con {email || "tu email"} para ver en qué etapa está esta
            postulación y presentarte a otras búsquedas sin recargar tus datos.
          </p>
          <Link
            href={registerHref}
            style={ctaStyle(accentColor)}
            className="mt-4 inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-3 text-sm font-semibold transition-[filter] hover:brightness-95"
          >
            Crear mi cuenta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow)]"
    >
      <input type="hidden" name="jobId" value={job.id} />
      <input type="hidden" name="slug" value={slug} />

      <div>
        <h2 className="font-display text-base font-bold tracking-[-0.01em] text-text">
          Postularme a {job.title}
        </h2>
        {isAnon && (
          <p className="mt-1 text-sm text-muted">
            No necesitás una cuenta. Cargá tus datos y tu CV, y el equipo de reclutamiento
            recibe tu postulación al instante.
          </p>
        )}
      </div>

      {isAnon ? (
        <>
          {/* Honeypot: oculto para humanos; si llega con valor, la action descarta el envío. */}
          <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
            <label>
              No completar
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <Input
            label="Nombre completo"
            name="fullName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input label="Teléfono" name="phone" type="tel" required />
          <Input label="Ubicación" name="location" placeholder="Ciudad, país" required />
        </>
      ) : (
        <>
          <Input label="Nombre completo" name="fullName" defaultValue={defaultName} required />
          <Input label="Email" name="email" type="email" defaultValue={defaultEmail} required />
          {defaultPhone ? (
            <input type="hidden" name="phone" value={defaultPhone} />
          ) : (
            <Input label="Teléfono (opcional)" name="phone" type="tel" />
          )}
        </>
      )}

      <Textarea label="Mensaje (opcional)" name="coverNote" rows={4} maxLength={2000} />

      <div className="flex gap-3">
        <div className="flex-1">
          <Input label="Pretensión salarial (opcional)" name="expectedSalary" type="number" min={0} />
        </div>
        <div className="w-24">
          <Input label="Moneda" name="expectedSalaryCurrency" maxLength={3} placeholder="USD" />
        </div>
      </div>

      {existingCvUrl ? (
        <input type="hidden" name="existingCvUrl" value={existingCvUrl} />
      ) : (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted">
            {isAnon ? "CV" : "CV (opcional)"}
          </label>
          <div className={fieldClass}>
            <input
              type="file"
              name="cv"
              accept=".pdf,.doc,.docx"
              required={isAnon}
              className="w-full text-sm text-text file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-primary-light file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary-hover"
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
        style={ctaStyle(accentColor)}
        className="hover:brightness-95"
      >
        Enviar postulación
      </Button>

      {isAnon && (
        <p className="text-center text-xs text-muted">
          ¿Ya tenés cuenta?{" "}
          <Link
            href={`/c/login?redirect=${encodeURIComponent(`/careers/${slug}/${job.id}/postular`)}`}
            className="font-semibold text-primary hover:underline"
          >
            Ingresá
          </Link>
        </p>
      )}
    </form>
  );
}

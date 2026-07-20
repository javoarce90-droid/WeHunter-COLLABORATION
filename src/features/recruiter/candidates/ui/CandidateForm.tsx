"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import type { CandidateFormState } from "../actions";
import { verificarEmailCandidatoAction } from "../actions";
import type { CandidateSource } from "../domain/candidate-details";
import type { VerificarCandidatoPorEmailResult } from "../domain/verificar-candidato-por-email";
import { Button } from "@/components/ui/button";
import { Input, fieldClasses } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CANDIDATE_SOURCE_LABELS } from "./source-meta";

type CandidateAction = (
  prev: CandidateFormState,
  formData: FormData,
) => Promise<CandidateFormState>;

interface CandidateFormProps {
  action: CandidateAction;
  submitLabel: string;
  candidateId?: string;
  /** A dónde vuelve "Cancelar". Default: el listado. Al editar, conviene volver a la ficha. */
  cancelHref?: string;
  defaults?: {
    fullName?: string;
    email?: string | null;
    phone?: string | null;
    hasCv?: boolean;
    headline?: string | null;
    location?: string | null;
    linkedinUrl?: string | null;
    summary?: string | null;
    skills?: string[] | null;
    source?: CandidateSource | null;
  };
}

// Base de campo compartida (bg-bg, foco, error) — reusa el primitivo en vez de duplicar clases.
const selectClass = fieldClasses();

const initialState: CandidateFormState = {};

export function CandidateForm({
  action,
  submitLabel,
  candidateId,
  cancelHref = "/candidates",
  defaults,
}: CandidateFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmDuplicateRef = useRef<HTMLInputElement>(null);
  const linkProfileRef = useRef<HTMLInputElement>(null);
  const skipProfileLinkRef = useRef<HTMLInputElement>(null);

  // Chequeo en vivo al salir del campo email (antes de completar el resto y enviar): mismo
  // aviso que daría el submit, pero apenas se necesita para no hacer tipear todo de nuevo.
  const [liveCheck, setLiveCheck] = useState<VerificarCandidatoPorEmailResult>(
    {},
  );
  const [checkingEmail, setCheckingEmail] = useState(false);
  const lastCheckedEmail = useRef("");

  async function onEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (candidateId) return; // al editar no hace falta (email opcional, sin alta nueva)
    const email = e.currentTarget.value.trim();
    if (!email || email === lastCheckedEmail.current) return;
    lastCheckedEmail.current = email;
    setCheckingEmail(true);
    const result = await verificarEmailCandidatoAction(email);
    setCheckingEmail(false);
    setLiveCheck(result);
  }

  // Los 3 flags son inputs hidden no controlados: se escribe el valor directo en el DOM
  // (no vía setState) porque requestSubmit() serializa el form de forma síncrona — un
  // setState recién se refleja en el DOM después de este handler, tarde para el submit.
  function resubmitWith(ref: React.RefObject<HTMLInputElement | null>) {
    if (ref.current) ref.current.value = "true";
    setLiveCheck({});
    formRef.current?.requestSubmit();
  }

  const shownDuplicate = state.duplicate ?? liveCheck.duplicate;
  const shownProfileMatch = shownDuplicate
    ? undefined
    : (state.profileMatch ?? liveCheck.profileMatch);

  return (
    <Card>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          {candidateId && (
            <input type="hidden" name="candidateId" value={candidateId} />
          )}
          <input
            ref={confirmDuplicateRef}
            type="hidden"
            name="confirmDuplicate"
            defaultValue=""
          />
          <input
            ref={linkProfileRef}
            type="hidden"
            name="linkProfile"
            defaultValue=""
          />
          <input
            ref={skipProfileLinkRef}
            type="hidden"
            name="skipProfileLink"
            defaultValue=""
          />

          <Input
            label="Nombre completo"
            name="fullName"
            type="text"
            placeholder="Ej: Ada Lovelace"
            defaultValue={defaults?.fullName ?? ""}
            required
            autoFocus
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label={candidateId ? "Email (opcional)" : "Email"}
              name="email"
              type="email"
              placeholder="ada@ejemplo.com"
              defaultValue={defaults?.email ?? ""}
              required={!candidateId}
              onBlur={onEmailBlur}
              onChange={() => {
                lastCheckedEmail.current = "";
                setLiveCheck({});
              }}
            />
            <Input
              label="Teléfono (opcional)"
              name="phone"
              type="tel"
              placeholder="Ej: +54 9 351 555-1234"
              defaultValue={defaults?.phone ?? ""}
            />
            <Input
              label="Ubicación (opcional)"
              name="location"
              type="text"
              placeholder="Ej: Córdoba, Argentina"
              defaultValue={defaults?.location ?? ""}
            />
          </div>

          {checkingEmail && !shownDuplicate && !shownProfileMatch && (
            <p className="-mt-2 text-xs text-muted">Revisando si ya existe…</p>
          )}

          {shownDuplicate ? (
            <div className="rounded-[var(--radius)] border border-warning/40 bg-[#FEF3C7] px-3 py-2.5 text-xs text-[#92400E]">
              <p>
                Ya existe un candidato con ese{" "}
                {shownDuplicate.matchedBy === "email" ? "email" : "LinkedIn"}:{" "}
                <strong>{shownDuplicate.fullName}</strong>.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Link
                  href={`/candidates/${shownDuplicate.id}`}
                  className="font-semibold underline"
                >
                  Ver candidato existente
                </Link>
                <button
                  type="button"
                  onClick={() => resubmitWith(confirmDuplicateRef)}
                  className="font-semibold underline"
                >
                  Es otra persona, crear igual
                </button>
              </div>
            </div>
          ) : shownProfileMatch ? (
            <div className="rounded-[var(--radius)] border border-warning/40 bg-[#FEF3C7] px-3 py-2.5 text-xs text-[#92400E]">
              <p>Ya existe una cuenta de WeHunter registrada con este email.</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => resubmitWith(linkProfileRef)}
                  className="font-semibold underline"
                >
                  Vincular esa cuenta
                </button>
                <button
                  type="button"
                  onClick={() => resubmitWith(skipProfileLinkRef)}
                  className="font-semibold underline"
                >
                  No vincular, crear igual
                </button>
              </div>
            </div>
          ) : null}

          <Input
            label="Titular / puesto actual (opcional)"
            name="headline"
            type="text"
            placeholder="Ej: Frontend Senior @ Acme"
            defaultValue={defaults?.headline ?? ""}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="LinkedIn (opcional)"
              name="linkedinUrl"
              type="text"
              inputMode="url"
              placeholder="linkedin.com/in/…"
              defaultValue={defaults?.linkedinUrl ?? ""}
            />
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted">
                Fuente (opcional)
              </span>
              <select
                name="source"
                defaultValue={defaults?.source ?? ""}
                className={selectClass}
              >
                <option value="">Sin especificar</option>
                {Object.entries(CANDIDATE_SOURCE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Input
            label="Skills (separadas por coma, opcional)"
            name="skills"
            type="text"
            placeholder="React, Node, PostgreSQL"
            defaultValue={(defaults?.skills ?? []).join(", ")}
          />

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">
              Resumen / experiencia (opcional)
            </span>
            <textarea
              name="summary"
              rows={4}
              placeholder="Una síntesis del perfil, experiencia y fortalezas…"
              defaultValue={defaults?.summary ?? ""}
              className={selectClass + " resize-y"}
            />
          </label>

          <div className="flex flex-col gap-1">
            <label htmlFor="cv" className="text-xs font-semibold text-muted">
              CV (PDF o Word, hasta 5 MB){" "}
              {defaults?.hasCv && "— opcional, reemplaza el actual"}
            </label>
            <input
              id="cv"
              name="cv"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="w-full rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-muted outline-none transition-colors file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-primary-light file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-hover focus:border-primary"
            />
            {defaults?.hasCv && (
              <p className="text-xs text-muted">
                Ya hay un CV cargado. Subí uno nuevo solo si querés
                reemplazarlo.
              </p>
            )}
          </div>

          {state.error && !shownDuplicate && !shownProfileMatch && (
            <p className="text-xs text-danger">{state.error}</p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending || checkingEmail}>
              {pending
                ? "Guardando…"
                : checkingEmail
                  ? "Revisando…"
                  : submitLabel}
            </Button>
            <Link
              href={cancelHref}
              className="text-sm font-semibold text-muted"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

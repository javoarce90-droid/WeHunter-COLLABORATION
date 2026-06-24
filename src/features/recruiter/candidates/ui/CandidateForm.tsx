"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { CandidateFormState } from "../actions";
import type { CandidateSource } from "../domain/candidate-details";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  defaults?: {
    fullName?: string;
    email?: string | null;
    hasCv?: boolean;
    headline?: string | null;
    location?: string | null;
    linkedinUrl?: string | null;
    summary?: string | null;
    skills?: string[] | null;
    source?: CandidateSource | null;
  };
}

const selectClass =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

const initialState: CandidateFormState = {};

export function CandidateForm({
  action,
  submitLabel,
  candidateId,
  defaults,
}: CandidateFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {candidateId && (
            <input type="hidden" name="candidateId" value={candidateId} />
          )}

          <Input
            label="Nombre completo"
            name="fullName"
            type="text"
            placeholder="Ej: Ada Lovelace"
            defaultValue={defaults?.fullName ?? ""}
            required
            autoFocus
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Email (opcional)"
              name="email"
              type="email"
              placeholder="ada@ejemplo.com"
              defaultValue={defaults?.email ?? ""}
            />
            <Input
              label="Ubicación (opcional)"
              name="location"
              type="text"
              placeholder="Ej: Córdoba, Argentina"
              defaultValue={defaults?.location ?? ""}
            />
          </div>

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
              placeholder="https://linkedin.com/in/…"
              defaultValue={defaults?.linkedinUrl ?? ""}
            />
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted">Fuente (opcional)</span>
              <select name="source" defaultValue={defaults?.source ?? ""} className={selectClass}>
                <option value="">—</option>
                {Object.entries(CANDIDATE_SOURCE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
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
            <span className="text-xs font-semibold text-muted">Resumen / experiencia (opcional)</span>
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
              CV (PDF o Word, hasta 5 MB) {defaults?.hasCv && "— opcional, reemplaza el actual"}
            </label>
            <input
              id="cv"
              name="cv"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-muted outline-none transition-colors file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-primary-light file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-hover focus:border-primary"
            />
            {defaults?.hasCv && (
              <p className="text-xs text-muted">
                Ya hay un CV cargado. Subí uno nuevo solo si querés reemplazarlo.
              </p>
            )}
          </div>

          {state.error && <p className="text-xs text-danger">{state.error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : submitLabel}
            </Button>
            <Link href="/candidates" className="text-sm font-semibold text-muted">
              Cancelar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

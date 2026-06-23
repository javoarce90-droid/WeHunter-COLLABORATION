"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { crearShortlistAction } from "../actions";
import type { ShortlistActionState } from "../actions";

type CandidateOption = {
  applicationId: string;
  fullName: string;
  stage: string;
};

type Props = {
  jobId: string;
  candidates: CandidateOption[];
};

const initialState: ShortlistActionState = {};

export function CrearShortlistForm({ jobId, candidates }: Props) {
  const [open, setOpen] = useState(false);
  const [state, dispatch, isPending] = useActionState<ShortlistActionState, FormData>(
    async (prev, formData) => {
      const result = await crearShortlistAction(prev, formData);
      if (!result.error) setOpen(false);
      return result;
    },
    initialState,
  );

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} disabled={candidates.length === 0}>
        + Crear shortlist
      </Button>
    );
  }

  return (
    <Card>
      <CardContent>
        <form action={dispatch} className="flex flex-col gap-4">
          <input type="hidden" name="jobId" value={jobId} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-xs font-semibold text-muted">
              Nombre del shortlist
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoFocus
              placeholder="Ej: Finalistas para el cliente"
              className="w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary"
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold text-muted">
              Candidatos a compartir
            </legend>
            {candidates.map((c) => (
              <label
                key={c.applicationId}
                className="flex items-center gap-2 rounded-[var(--radius)] border border-border px-3 py-2 text-sm text-text"
              >
                <input
                  type="checkbox"
                  name="applicationIds"
                  value={c.applicationId}
                  className="accent-primary"
                />
                <span className="flex-1">{c.fullName}</span>
                <span className="text-xs text-muted">{c.stage}</span>
              </label>
            ))}
          </fieldset>

          {state.error && <p className="text-xs text-danger">{state.error}</p>}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-muted hover:text-text"
            >
              Cancelar
            </button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creando…" : "Crear shortlist"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

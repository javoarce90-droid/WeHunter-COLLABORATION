"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

          <Input
            label="Nombre del shortlist"
            id="name"
            name="name"
            type="text"
            required
            autoFocus
            placeholder="Ej: Finalistas para el cliente"
          />

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold text-muted">
              Candidatos a compartir
            </legend>
            {candidates.map((c) => (
              <label
                key={c.applicationId}
                className="flex cursor-pointer items-center gap-2 rounded-[var(--radius)] border border-border px-3 py-2 text-sm text-text transition-colors hover:bg-bg"
              >
                <Checkbox name="applicationIds" value={c.applicationId} />
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
              className="rounded text-sm font-semibold text-muted outline-none transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
            >
              Cancelar
            </button>
            <Button type="submit" loading={isPending}>
              Crear shortlist
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

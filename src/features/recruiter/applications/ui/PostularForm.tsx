"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { postularCandidatoAction } from "../actions";
import type { Candidate } from "@/db/schema";

type Props = {
  jobId: string;
  candidates: Pick<Candidate, "id" | "fullName" | "email">[];
};

const initialState: { error?: string } = {};

export function PostularForm({ jobId, candidates }: Props) {
  const [open, setOpen] = useState(false);
  const [state, dispatch, isPending] = useActionState<{ error?: string }, FormData>(
    async (prev, formData) => {
      const result = await postularCandidatoAction(prev, formData);
      if (!result.error) setOpen(false);
      return result;
    },
    initialState,
  );

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        + Postular candidato
      </Button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-text">Postular candidato</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted transition-colors hover:text-text"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form action={dispatch} className="flex flex-col gap-4 p-5">
          <input type="hidden" name="jobId" value={jobId} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="candidateId" className="text-xs font-semibold text-muted">
              Candidato del pool
            </label>
            {candidates.length === 0 ? (
              <p className="text-sm text-muted">
                No hay candidatos en el pool. Cargá uno primero desde{" "}
                <a href="/candidates/new" className="text-primary hover:underline">
                  Candidatos
                </a>
                .
              </p>
            ) : (
              <select
                id="candidateId"
                name="candidateId"
                required
                className="w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary"
              >
                <option value="">Seleccioná un candidato…</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                    {c.email ? ` — ${c.email}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {state.error && <p className="text-xs text-red-600">{state.error}</p>}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-muted hover:text-text"
            >
              Cancelar
            </button>
            <Button type="submit" disabled={isPending || candidates.length === 0}>
              {isPending ? "Postulando…" : "Postular"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

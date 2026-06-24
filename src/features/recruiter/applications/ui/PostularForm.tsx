"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
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

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + Postular candidato
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        side="center"
        title="Postular candidato"
        className="max-w-sm"
      >
        <form action={dispatch} className="flex flex-col gap-4">
          <input type="hidden" name="jobId" value={jobId} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="candidateId" className="text-xs font-semibold text-muted">
              Candidato del pool
            </label>
            {candidates.length === 0 ? (
              <p className="text-sm text-muted">
                No hay candidatos en el pool. Cargá uno primero desde{" "}
                <Link href="/candidates/new" className="text-primary hover:underline">
                  Candidatos
                </Link>
                .
              </p>
            ) : (
              <select
                id="candidateId"
                name="candidateId"
                required
                className="w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]"
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

          {state.error && <p className="text-xs text-danger">{state.error}</p>}

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
      </Dialog>
    </>
  );
}

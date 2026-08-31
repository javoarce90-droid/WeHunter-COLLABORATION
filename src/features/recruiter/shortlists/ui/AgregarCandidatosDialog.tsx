"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/lib/toast";
import { agregarCandidatosAShortlistAction } from "../actions";
import type { AgregarCandidatosState } from "../actions";

type CandidateOption = {
  applicationId: string;
  fullName: string;
  stage: string;
};

type Props = {
  shortlistId: string;
  jobId: string;
  /** Postulaciones del pipeline de esta búsqueda que todavía NO están en la shortlist. */
  available: CandidateOption[];
};

const initialState: AgregarCandidatosState = {};

/**
 * "+ Agregar candidato" a una shortlist ya creada. El enlace compartido no cambia — la vista
 * del cliente lee los candidatos en vivo, así que lo agregado aparece solo. Mismo patrón de
 * checkboxes que `CrearShortlistForm`, sin el campo de nombre.
 */
export function AgregarCandidatosDialog({ shortlistId, jobId, available }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const [state, dispatch, isPending] = useActionState<AgregarCandidatosState, FormData>(
    async (prev, formData) => {
      const result = await agregarCandidatosAShortlistAction(prev, formData);
      if (!result.error) {
        setOpen(false);
        const n = result.added ?? 0;
        toast({
          message:
            n > 0
              ? `${n} candidato${n !== 1 ? "s" : ""} agregado${n !== 1 ? "s" : ""} a la shortlist.`
              : "Esos candidatos ya estaban en la shortlist.",
          variant: n > 0 ? "success" : "default",
        });
        router.refresh();
      }
      return result;
    },
    initialState,
  );

  if (available.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded text-xs font-semibold text-primary outline-none transition-colors hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        + Agregar candidato
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        side="right"
        title="Agregar candidatos a la shortlist"
      >
        <form action={dispatch} className="flex flex-col gap-4">
          <input type="hidden" name="shortlistId" value={shortlistId} />
          <input type="hidden" name="jobId" value={jobId} />

          <p className="text-sm text-muted">
            Sumá candidatos de esta búsqueda. El enlace que ya compartiste no cambia — la
            empresa ve la lista actualizada al instante.
          </p>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold text-muted">
              Candidatos del pipeline que todavía no están en la shortlist
            </legend>
            {available.map((c) => (
              <label
                key={c.applicationId}
                className="flex cursor-pointer items-center gap-2 rounded-[var(--radius)] border border-border px-3 py-2 text-sm text-text transition-colors hover:bg-bg"
              >
                <Checkbox name="applicationIds" value={c.applicationId} />
                <span className="flex-1 truncate">{c.fullName}</span>
                <span className="shrink-0 text-xs text-muted">{c.stage}</span>
              </label>
            ))}
          </fieldset>

          {state.error && <p className="text-xs text-danger">{state.error}</p>}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded text-sm font-semibold text-muted outline-none transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Cancelar
            </button>
            <Button type="submit" loading={isPending}>
              Agregar
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

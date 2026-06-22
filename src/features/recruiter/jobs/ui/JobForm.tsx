"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { JobFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type JobAction = (
  prev: JobFormState,
  formData: FormData,
) => Promise<JobFormState>;

interface JobFormProps {
  action: JobAction;
  submitLabel: string;
  jobId?: string;
  defaults?: { title?: string; description?: string | null };
}

const initialState: JobFormState = {};

export function JobForm({ action, submitLabel, jobId, defaults }: JobFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {jobId && <input type="hidden" name="jobId" value={jobId} />}

          <Input
            label="Título de la búsqueda"
            name="title"
            type="text"
            placeholder="Ej: Backend Engineer (Node)"
            defaultValue={defaults?.title ?? ""}
            required
            autoFocus
          />

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="description"
                className="text-xs font-semibold text-muted"
              >
                Descripción
              </label>
              {/* Hook IA (diferido): se habilita cuando entren las reglas de WeHunter. */}
              <button
                type="button"
                disabled
                title="Generación con IA — disponible próximamente"
                className="text-xs font-semibold text-ai opacity-50"
              >
                ✨ Generar con IA
              </button>
            </div>
            <textarea
              id="description"
              name="description"
              rows={6}
              placeholder="Responsabilidades, requisitos, condiciones…"
              defaultValue={defaults?.description ?? ""}
              className="w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[rgba(123,47,219,0.2)]"
            />
          </div>

          {state.error && <p className="text-xs text-danger">{state.error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : submitLabel}
            </Button>
            <Link href="/jobs" className="text-sm font-semibold text-muted">
              Cancelar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

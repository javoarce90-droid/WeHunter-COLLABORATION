"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast";
import { ScreeningBuilder } from "./ScreeningBuilder";
import { guardarScreeningAction } from "../actions";
import type { ScreeningQuestionInput } from "../domain/definir-preguntas-screening";

/**
 * Paso post-creación de búsqueda: el recruiter suma preguntas de screening (opcional) y recién
 * después cae en el aviso. Ambos botones navegan al mismo destino (el aviso); la única
 * diferencia es si las preguntas quedan guardadas o no, por eso el copy nombra ese objeto en
 * vez de usar "omitir" a secas. "Guardar y continuar" queda deshabilitado sin preguntas: no hay
 * nada que guardar, así que la única acción posible es continuar sin ellas.
 */
export function ScreeningStep({
  jobId,
  initialQuestions,
}: {
  jobId: string;
  initialQuestions: ScreeningQuestionInput[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [questions, setQuestions] = useState<ScreeningQuestionInput[]>(initialQuestions);
  const [saving, setSaving] = useState(false);

  const avisoHref = `/jobs/${jobId}/aviso`;

  async function guardarYContinuar() {
    setSaving(true);
    const res = await guardarScreeningAction(jobId, questions);
    setSaving(false);
    if (!res.ok) {
      toast({ message: res.error ?? "No se pudo guardar el screening.", variant: "danger" });
      return;
    }
    router.push(avisoHref);
  }

  return (
    <div className="flex flex-col gap-5">
      <ScreeningBuilder questions={questions} onChange={setQuestions} jobId={jobId} />

      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => router.push(avisoHref)}
          disabled={saving}
          className="rounded text-sm font-semibold text-muted outline-none transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:opacity-50"
        >
          Continuar sin preguntas
        </button>
        <Button
          type="button"
          loading={saving}
          disabled={questions.length === 0}
          onClick={guardarYContinuar}
        >
          Guardar y continuar
        </Button>
      </div>
    </div>
  );
}

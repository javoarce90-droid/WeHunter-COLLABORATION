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
 * después cae en el aviso. "Omitir" sigue de largo sin guardar; "Guardar y continuar" persiste
 * vía `guardarScreeningAction` y navega. Mismo destino final para ambos: el aviso.
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
      <ScreeningBuilder questions={questions} onChange={setQuestions} />

      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => router.push(avisoHref)}
          disabled={saving}
          className="rounded text-sm font-semibold text-muted outline-none transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:opacity-50"
        >
          Omitir por ahora
        </button>
        <Button type="button" loading={saving} onClick={guardarYContinuar}>
          Guardar y continuar
        </Button>
      </div>
    </div>
  );
}

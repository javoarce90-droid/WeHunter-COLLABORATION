"use client";

import { useState, useTransition } from "react";
import { AiButton, SparkleIcon } from "@/components/ui/ai";
import { useToast } from "@/lib/toast";
import { generarInsightsAction } from "../actions";

/** Panel ✦ de insights de IA (mock) sobre el rendimiento de la búsqueda. Genera bajo demanda. */
export function ReportInsights({ jobId }: { jobId: string }) {
  const toast = useToast();
  const [, start] = useTransition();
  const [text, setText] = useState<string | null>(null);

  function generar() {
    start(async () => {
      const res = await generarInsightsAction(jobId);
      if (!res.ok || !res.insights) {
        toast({ message: res.error ?? "No se pudo generar.", variant: "danger" });
        return;
      }
      setText(res.insights);
    });
  }

  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-text">
          <span className="text-primary">
            <SparkleIcon size={14} />
          </span>
          Insights de IA
        </h2>
        <AiButton type="button" onClick={generar}>
          {text ? "Regenerar" : "Generar"}
        </AiButton>
      </div>
      {text ? (
        <p className="text-sm leading-relaxed text-text">{text}</p>
      ) : (
        <p className="text-sm text-muted">
          Generá un resumen del rendimiento de esta búsqueda con sugerencias accionables.
        </p>
      )}
    </section>
  );
}

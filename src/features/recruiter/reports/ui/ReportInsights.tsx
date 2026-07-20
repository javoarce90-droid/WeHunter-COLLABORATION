"use client";

import { useState, useTransition } from "react";
import { AiButton, SparkleIcon } from "@/components/ui/ai";
import { SectionCard } from "@/components/ui/section-card";
import { useToast } from "@/lib/toast";
import { generarInsightsAction } from "../actions";

/** Panel ✦ de insights de IA (mock) sobre el rendimiento de la búsqueda. Genera bajo demanda. */
export function ReportInsights({ jobId }: { jobId: string }) {
  const toast = useToast();
  const [pending, start] = useTransition();
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
    <SectionCard
      title={
        <>
          <span className="text-primary">
            <SparkleIcon size={14} />
          </span>
          Insights de IA
        </>
      }
      action={
        <AiButton type="button" onClick={generar} loading={pending}>
          {text ? "Regenerar" : "Generar"}
        </AiButton>
      }
    >
      {text ? (
        <p className="text-sm leading-relaxed text-text">{text}</p>
      ) : (
        <p className="text-sm text-muted">
          Generá un resumen del rendimiento de esta búsqueda con sugerencias accionables.
        </p>
      )}
    </SectionCard>
  );
}

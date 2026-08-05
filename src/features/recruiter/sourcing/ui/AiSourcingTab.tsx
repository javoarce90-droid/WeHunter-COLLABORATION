"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { AiJobSourcingResults } from "./AiJobSourcingResults";
import type { SourcingJobOption } from "./SourcingView";

type Props = {
  jobs: SourcingJobOption[];
};

export function AiSourcingTab({ jobs }: Props) {
  const [selectedJobId, setSelectedJobId] = useState("");

  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No tenés búsquedas abiertas"
        description="El sourcing con IA arma la query y puntúa los resultados según el contexto de una búsqueda. Creá una para empezar."
        action={{ label: "Crear búsqueda", href: "/jobs/new" }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="max-w-sm">
        <Select
          label="Búsqueda"
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
        >
          <option value="">Elegí una búsqueda…</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </Select>
      </div>

      {selectedJobId ? (
        <AiJobSourcingResults key={selectedJobId} jobId={selectedJobId} />
      ) : (
        <p className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-xs text-muted">
          Elegí una búsqueda para que la IA arme la query y puntúe los
          resultados — no hace falta que tipees nada.
        </p>
      )}
    </div>
  );
}

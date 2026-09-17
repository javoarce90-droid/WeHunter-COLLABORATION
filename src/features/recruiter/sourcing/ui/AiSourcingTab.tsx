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
  // Mientras `AiJobSourcingResults` tiene una búsqueda en curso, deshabilita el selector — sin
  // esto, cambiarlo desmonta el componente (por el `key` de abajo) y la única señal de que la
  // búsqueda anterior seguía corriendo era un toast fácil de perderse en el cambio de pantalla.
  const [searching, setSearching] = useState(false);

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
          disabled={searching}
          title={searching ? "Esperá a que termine la búsqueda en curso para cambiarla" : undefined}
        >
          <option value="">Elegí una búsqueda…</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </Select>
        {searching && (
          <p className="mt-1 text-xs text-muted">
            Buscando candidatos — podés esperar o navegar a otra pantalla, te avisamos cuando
            esté.
          </p>
        )}
      </div>

      {selectedJobId ? (
        <AiJobSourcingResults
          key={selectedJobId}
          jobId={selectedJobId}
          jobTitle={jobs.find((j) => j.id === selectedJobId)?.title}
          onSearchingChange={setSearching}
        />
      ) : (
        <p className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-xs text-muted">
          Elegí una búsqueda para que la IA arme la query y puntúe los
          resultados — no hace falta que tipees nada.
        </p>
      )}
    </div>
  );
}

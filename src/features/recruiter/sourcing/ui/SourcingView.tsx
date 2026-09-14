"use client";

import { AiSourcingTab } from "./AiSourcingTab";

export type SourcingJobOption = { id: string; title: string };

type Props = {
  jobs: SourcingJobOption[];
};

export function SourcingView({ jobs }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-bold text-text">Sourcing</h1>
        <p className="text-sm text-muted">
          Buscá candidatos con IA para una búsqueda puntual.
        </p>
      </div>

      <AiSourcingTab jobs={jobs} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { AiSourcingTab } from "./AiSourcingTab";
import { LinkedInSourcingTab } from "./LinkedInSourcingTab";

type Tab = "ai" | "linkedin";

export type SourcingJobOption = { id: string; title: string };

type Props = {
  jobs: SourcingJobOption[];
};

export function SourcingView({ jobs }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("ai");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-bold text-text">Sourcing</h1>
        <p className="text-sm text-muted">
          Buscá candidatos con IA para una búsqueda puntual o directamente en LinkedIn.
        </p>
      </div>

      {/* Pestañas de navegación */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("ai")}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "ai"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-text"
          }`}
        >
          Sourcing con IA
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("linkedin")}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "linkedin"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-text"
          }`}
        >
          Sourcing Manual
        </button>
      </div>

      {/* Ambas tabs quedan montadas siempre: la búsqueda de cada una persiste al cambiar de
          tab, no se pierde hasta que el usuario la limpia explícitamente. */}
      <div className={activeTab === "ai" ? "" : "hidden"}>
        <AiSourcingTab jobs={jobs} />
      </div>
      <div className={activeTab === "linkedin" ? "" : "hidden"}>
        <LinkedInSourcingTab jobs={jobs} />
      </div>
    </div>
  );
}

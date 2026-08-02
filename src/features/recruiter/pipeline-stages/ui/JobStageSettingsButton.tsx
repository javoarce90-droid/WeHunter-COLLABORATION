"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { JobStageSettingsPanel } from "./JobStageSettingsPanel";
import type { JobStage } from "../schema";

type Props = {
  jobId: string;
  stages: JobStage[];
};

export function JobStageSettingsButton({ jobId, stages }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        title="Configurar etapas de esta búsqueda"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
        </svg>
        Etapas
      </Button>

      <JobStageSettingsPanel
        jobId={jobId}
        stages={stages}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

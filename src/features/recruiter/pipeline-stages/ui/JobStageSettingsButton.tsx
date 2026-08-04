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
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
        Configurar etapas
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

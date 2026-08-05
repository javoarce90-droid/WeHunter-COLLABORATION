"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { AiButton } from "@/components/ui/ai";
import { AiJobSourcingResults } from "../../sourcing/ui/AiJobSourcingResults";

type Props = {
  jobId: string;
};

export function SourcingIADialog({ jobId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AiButton type="button" variant="outline" onClick={() => setOpen(true)}>
        Sourcing con IA
      </AiButton>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        side="right"
        title="Sourcing con IA"
        className="w-full max-w-xl"
      >
        <AiJobSourcingResults jobId={jobId} />
      </Dialog>
    </>
  );
}

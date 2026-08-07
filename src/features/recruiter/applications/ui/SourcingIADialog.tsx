"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AiButton } from "@/components/ui/ai";
import { AiJobSourcingResults } from "../../sourcing/ui/AiJobSourcingResults";

type Props = {
  jobId: string;
};

export function SourcingIADialog({ jobId }: Props) {
  const [open, setOpen] = useState(false);
  const [hasUnreviewedResults, setHasUnreviewedResults] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  function requestClose() {
    // Resultados ya calculados y sin revisar no se persisten — cerrar los pierde de verdad.
    // Mientras solo está buscando (sin resultados todavía) no hay nada que perder: el toast
    // de AiJobSourcingResults ya avisa que sigue corriendo en background.
    if (hasUnreviewedResults) {
      setConfirmingClose(true);
      return;
    }
    setOpen(false);
  }

  return (
    <>
      <AiButton type="button" variant="outline" onClick={() => setOpen(true)}>
        Sourcing con IA
      </AiButton>

      <Dialog
        open={open}
        onClose={requestClose}
        side="right"
        title="Sourcing con IA"
        className="w-full max-w-xl"
      >
        <AiJobSourcingResults
          jobId={jobId}
          open={open}
          onUnreviewedResultsChange={setHasUnreviewedResults}
        />
      </Dialog>

      <Dialog
        open={confirmingClose}
        onClose={() => setConfirmingClose(false)}
        side="center"
        title="¿Cerrar sin revisar los resultados?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text">
            Encontramos candidatos en LinkedIn que todavía no sumaste al pool ni omitiste. No se
            guardan si cerrás sin revisarlos — vas a tener que repetir la búsqueda.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmingClose(false)}>
              Seguir revisando
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmingClose(false);
                setOpen(false);
              }}
            >
              Cerrar de todos modos
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

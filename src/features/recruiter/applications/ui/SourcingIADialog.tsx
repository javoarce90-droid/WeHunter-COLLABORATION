"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AiButton } from "@/components/ui/ai";
import { AiJobSourcingResults } from "../../sourcing/ui/AiJobSourcingResults";

type Props = {
  jobId: string;
  jobTitle: string;
  /** true si se llegó acá con `?sourcing=1` (link de la notificación de "Terminó el sourcing
   *  con IA") — abre el panel directo, ya con la sesión restaurada por AiJobSourcingResults. */
  autoOpenSourcing?: boolean;
};

export function SourcingIADialog({ jobId, jobTitle, autoOpenSourcing = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(autoOpenSourcing);
  const [hasUnreviewedResults, setHasUnreviewedResults] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  // Saca el ?sourcing=1 de la URL una vez abierto, para que un refresh o volver atrás no
  // reabra el panel solo. Corre una sola vez al montar (no depende de `open`: si el recruiter
  // lo cierra y reabre a mano no hay query param que limpiar de nuevo).
  useEffect(() => {
    if (!autoOpenSourcing) return;
    router.replace(pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          jobTitle={jobTitle}
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
            Encontramos candidatos en LinkedIn que todavía no sumaste al pool ni ignoraste. No se
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

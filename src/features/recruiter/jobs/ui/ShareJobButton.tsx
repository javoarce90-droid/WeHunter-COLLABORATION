"use client";

import { useTransition } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useToast } from "@/lib/toast";
import { registrarCompartidaBusquedaAction } from "../actions";

/** Mismo copiar-link + contador que ya usa el menú kebab del listado (`JobsList.tsx`), acá
 *  como botón directo en el header del detalle — es donde lo pone el prototipo. */
export function ShareJobButton({ jobId, orgSlug }: { jobId: string; orgSlug: string | null }) {
  const toast = useToast();
  const [, startTransition] = useTransition();

  function share() {
    if (!orgSlug) return;
    navigator.clipboard.writeText(`${window.location.origin}/careers/${orgSlug}/${jobId}`);
    toast({ message: "Link de la búsqueda copiado al portapapeles", variant: "success" });
    const fd = new FormData();
    fd.set("jobId", jobId);
    startTransition(() => registrarCompartidaBusquedaAction(fd));
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={!orgSlug}
      className={buttonVariants({ variant: "secondary", size: "sm" })}
    >
      🔗 Compartir
    </button>
  );
}

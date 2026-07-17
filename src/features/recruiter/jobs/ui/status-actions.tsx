import type { Job } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { cambiarEstadoBusquedaAction } from "../actions";

/**
 * Transiciones de estado ofrecidas por la UI, con su etiqueta. Definidas una sola vez y
 * reusadas por el listado y por la vista previa del aviso (conventions.md: no duplicar).
 *
 * Espeja las transiciones válidas del dominio (`cambiar-estado-busqueda.ts`), que es quien
 * las hace cumplir de verdad: esto es solo qué botón se muestra. "Archivar" está disponible
 * desde cualquier estado salvo `archived` (terminal, sin desarchivar en esta v1).
 */

type Status = Job["status"];

export const STATUS_ACTIONS: Record<Status, { label: string; to: Status }[]> = {
  draft: [
    { label: "Publicar", to: "open" },
    { label: "Archivar", to: "archived" },
  ],
  open: [
    { label: "Pausar", to: "paused" },
    { label: "Cerrar", to: "closed" },
    { label: "Archivar", to: "archived" },
  ],
  paused: [
    { label: "Reanudar", to: "open" },
    { label: "Cerrar", to: "closed" },
    { label: "Archivar", to: "archived" },
  ],
  closed: [{ label: "Archivar", to: "archived" }],
  archived: [],
};

export function StatusButton({
  jobId,
  label,
  to,
  variant = "ghost",
}: {
  jobId: string;
  label: string;
  to: Status;
  variant?: "primary" | "ghost";
}) {
  const isClosing = to === "closed";
  return (
    <form action={cambiarEstadoBusquedaAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="nuevoEstado" value={to} />
      <Button
        type="submit"
        variant={variant}
        size="sm"
        className={
          isClosing && variant === "ghost"
            ? "hover:border-danger hover:text-danger"
            : undefined
        }
      >
        {label}
      </Button>
    </form>
  );
}

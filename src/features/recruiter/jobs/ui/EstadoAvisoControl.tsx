import type { Job } from "@/db/schema";
import { STATUS_ACTIONS, StatusButton } from "./status-actions";
import { PublishConfirmButton } from "./PublishConfirmButton";

/**
 * Transiciones de estado desde la vista previa del aviso: el recruiter revisa cómo se va a
 * ver y opera ahí mismo, sin volver al listado.
 *
 * Ofrece las mismas transiciones que el listado (STATUS_ACTIONS, fuente única). La primera
 * del estado va destacada porque es la acción natural desde acá — publicar un borrador que
 * se acaba de revisar. `archived` no ofrece ninguna: es terminal.
 *
 * Sin badge de estado: el layout de la búsqueda ya lo muestra al lado del título.
 */
export function EstadoAvisoControl({ job }: { job: Pick<Job, "id" | "status" | "title"> }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUS_ACTIONS[job.status].map((a, i) =>
        a.to === "open" ? (
          <PublishConfirmButton
            key={a.to}
            jobId={job.id}
            jobTitle={job.title}
            variant={i === 0 ? "primary" : "ghost"}
          />
        ) : (
          <StatusButton
            key={a.to}
            jobId={job.id}
            label={a.label}
            to={a.to}
            variant={i === 0 ? "primary" : "ghost"}
          />
        ),
      )}
    </div>
  );
}

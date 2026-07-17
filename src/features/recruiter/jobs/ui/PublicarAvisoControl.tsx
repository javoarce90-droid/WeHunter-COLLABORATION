import type { Job } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JOB_STATUS_META } from "./status-meta";
import { cambiarEstadoBusquedaAction } from "../actions";

/**
 * Acceso contextual a publicar desde la vista previa del aviso: el recruiter revisa cómo se
 * va a ver y publica ahí mismo, sin volver al listado.
 *
 * Solo ofrece draft → open. El resto de las transiciones (pausar/cerrar/archivar) siguen
 * viviendo en el listado: acá el contexto es "¿está listo este aviso para salir?", no
 * gestionar el ciclo de vida completo. En los demás estados se muestra solo el badge, para
 * que quede claro por qué no hay botón.
 */
export function PublicarAvisoControl({ job }: { job: Pick<Job, "id" | "status"> }) {
  const meta = JOB_STATUS_META[job.status];

  if (job.status !== "draft") {
    return <Badge variant={meta.variant}>{meta.label}</Badge>;
  }

  return (
    <form action={cambiarEstadoBusquedaAction} className="flex items-center gap-3">
      <Badge variant={meta.variant}>{meta.label}</Badge>
      <input type="hidden" name="jobId" value={job.id} />
      <input type="hidden" name="nuevoEstado" value="open" />
      <Button type="submit" size="sm">
        Publicar búsqueda
      </Button>
    </form>
  );
}

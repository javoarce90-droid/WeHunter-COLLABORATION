import Link from "next/link";
import type { Job } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cambiarEstadoBusquedaAction } from "../actions";

type Status = Job["status"];

const STATUS_META: Record<
  Status,
  { label: string; variant: "muted" | "success" | "warning" | "danger" }
> = {
  draft: { label: "Borrador", variant: "muted" },
  open: { label: "Abierta", variant: "success" },
  paused: { label: "Pausada", variant: "warning" },
  closed: { label: "Cerrada", variant: "danger" },
};

// Acciones de transición disponibles desde cada estado (label + estado destino).
const STATUS_ACTIONS: Record<Status, { label: string; to: Status }[]> = {
  draft: [{ label: "Publicar", to: "open" }],
  open: [
    { label: "Pausar", to: "paused" },
    { label: "Cerrar", to: "closed" },
  ],
  paused: [
    { label: "Reanudar", to: "open" },
    { label: "Cerrar", to: "closed" },
  ],
  closed: [],
};

function StatusButton({ jobId, label, to }: { jobId: string; label: string; to: Status }) {
  return (
    <form action={cambiarEstadoBusquedaAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="nuevoEstado" value={to} />
      <button
        type="submit"
        className="rounded-[var(--radius)] border border-border px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
      >
        {label}
      </button>
    </form>
  );
}

export function JobsList({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center text-sm text-muted">
          Todavía no tenés búsquedas. Creá la primera para empezar a sumar candidatos.
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {jobs.map((job) => {
        const meta = STATUS_META[job.status];
        return (
          <Card key={job.id}>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-text">{job.title}</h3>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                {job.description && (
                  <p className="mt-1 line-clamp-1 text-sm text-muted">
                    {job.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {STATUS_ACTIONS[job.status].map((a) => (
                  <StatusButton key={a.to} jobId={job.id} label={a.label} to={a.to} />
                ))}
                <Link
                  href={`/jobs/${job.id}/pipeline`}
                  className="rounded-[var(--radius)] border border-border px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
                >
                  Pipeline
                </Link>
                <Link
                  href={`/jobs/${job.id}/edit`}
                  className="rounded-[var(--radius)] px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:text-primary"
                >
                  Editar
                </Link>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

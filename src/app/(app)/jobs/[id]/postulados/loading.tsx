import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback de la bandeja de Postulados mientras resuelven las queries. Reproduce la barra
 * de filtros + filas de la tabla real (avatar/nombre, badges, match) para que el layout no
 * salte cuando llegan los datos.
 */
export default function PostuladosLoading() {
  return (
    <div className="flex flex-col gap-4 p-6" aria-hidden>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-64 rounded-[var(--radius)]" />
        <Skeleton className="h-9 w-24 rounded-[var(--radius)]" />
        <Skeleton className="h-9 w-24 rounded-[var(--radius)]" />
      </div>

      <Card>
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

const COLUMN_CARD_COUNTS = [3, 2, 3, 1, 2];

/**
 * Fallback del tablero Kanban mientras resuelven las queries de Pipeline. Reproduce la
 * silueta real (columnas con título + contador, cards con avatar/nombre/badges) para que
 * el layout no salte cuando llegan los datos.
 */
export default function PipelineLoading() {
  return (
    <div className="flex h-full gap-4 overflow-hidden p-6" aria-hidden>
      {COLUMN_CARD_COUNTS.map((cardCount, columnIndex) => (
        <div
          key={columnIndex}
          className="flex w-72 shrink-0 flex-col gap-3 rounded-[var(--radius)] bg-bg p-3"
        >
          <div className="flex items-center justify-between gap-2 px-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>

          <div className="flex flex-col gap-3">
            {Array.from({ length: cardCount }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                className="rounded-[var(--radius)] border border-border bg-surface p-3 shadow-[var(--shadow)]"
              >
                <div className="flex items-start gap-2">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Skeleton className="h-4 w-12 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

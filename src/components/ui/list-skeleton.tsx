import { Card } from "./card";
import { Skeleton } from "./skeleton";

/**
 * Placeholder genérico para listados que se streamean dentro de <Suspense>.
 * Mantiene el layout (sin saltos) mientras la query llega.
 */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i}>
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
}

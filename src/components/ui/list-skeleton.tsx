import { Card } from "./card";

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
              <div className="h-4 w-48 animate-pulse rounded bg-border" />
              <div className="h-3 w-32 animate-pulse rounded bg-border" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded bg-border" />
          </div>
        </Card>
      ))}
    </div>
  );
}

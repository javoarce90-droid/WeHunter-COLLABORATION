import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/ui/list-skeleton";

/**
 * Fallback de ruta para /clients. Sin este archivo, Next.js espera el render completo del
 * Server Component (incluida la lectura de membership antes del `<Suspense>` interno de
 * `page.tsx`) antes de pintar nada — la navegación desde el sidebar se sentía trabada un
 * segundo en vez de instantánea. Espeja el shape real de la página (título + botón + banner +
 * listado) para que el swap al contenido real no salte.
 */
export default function ClientsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32 rounded-[var(--radius)]" />
      </div>
      <Skeleton className="h-10 w-full rounded-[var(--radius)]" />
      <ListSkeleton />
    </div>
  );
}

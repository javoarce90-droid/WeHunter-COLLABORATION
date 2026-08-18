import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback de navegación entre tabs de una búsqueda (Detalle/Aviso/Editar/Ofertas/
 * Rendimiento/Shortlists). El layout ya pintó header + tabs — esto es solo el área de
 * contenido, para que el click en una tab muestre feedback inmediato en vez de una
 * pantalla congelada mientras resuelven las queries de esa página.
 */
export default function JobTabLoading() {
  return (
    <div className="flex flex-col gap-6 p-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <Card>
        <div className="flex flex-col gap-4 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

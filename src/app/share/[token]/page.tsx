import { getSharedShortlist } from "@/features/company/shortlist-review/data/shortlist-review.data";
import { SharedShortlistView } from "@/features/company/shortlist-review/ui/SharedShortlistView";

interface Props {
  params: Promise<{ token: string }>;
}

// La empresa no tiene sesión: nada de cache, cada visita valida el token contra la base.
export const dynamic = "force-dynamic";

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const shortlist = await getSharedShortlist(token);

  if (!shortlist) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
        <div className="max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 text-center">
          <h1 className="font-display text-lg font-bold text-text">Enlace no disponible</h1>
          <p className="mt-2 text-sm text-muted">
            Este enlace no existe, fue revocado o venció. Pedile al reclutador uno nuevo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg">
      <SharedShortlistView token={token} shortlist={shortlist} />
    </div>
  );
}

import { getClientPortal } from "@/features/company/hiring-request/data/hiring-request.data";
import { ClientPortalView } from "@/features/company/hiring-request/ui/ClientPortalView";

interface Props {
  params: Promise<{ token: string }>;
}

// El cliente no tiene sesión: nada de cache, cada visita valida el token contra la base.
export const dynamic = "force-dynamic";

export default async function ClientPortalPage({ params }: Props) {
  const { token } = await params;
  const portal = await getClientPortal(token);

  if (!portal) {
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
      <ClientPortalView token={token} portal={portal} />
    </div>
  );
}

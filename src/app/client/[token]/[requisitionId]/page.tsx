import { getClientRequisitionDetail } from "@/features/company/hiring-request/data/hiring-request.data";
import { RequisitionDetailView } from "@/features/company/hiring-request/ui/RequisitionDetailView";

interface Props {
  params: Promise<{ token: string; requisitionId: string }>;
}

// El cliente no tiene sesión: nada de cache, cada visita valida el token contra la base.
export const dynamic = "force-dynamic";

export default async function ClientRequisitionDetailPage({ params }: Props) {
  const { token, requisitionId } = await params;
  const detail = await getClientRequisitionDetail(token, requisitionId);

  if (!detail) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
        <div className="max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 text-center">
          <h1 className="font-display text-lg font-bold text-text">Solicitud no disponible</h1>
          <p className="mt-2 text-sm text-muted">
            Este enlace no existe, fue revocado, venció, o la solicitud no corresponde a este
            cliente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg">
      <RequisitionDetailView token={token} detail={detail} />
    </div>
  );
}

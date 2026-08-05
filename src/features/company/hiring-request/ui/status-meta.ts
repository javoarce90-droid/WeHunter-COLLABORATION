import type { RequisitionStatus } from "../data/hiring-request.data";
import type { RequisitionReason } from "../domain/solicitar-busqueda";

export const STATUS_META: Record<
  RequisitionStatus,
  { label: string; variant: "warning" | "success" | "danger" }
> = {
  pending: { label: "Pendiente de revisión", variant: "warning" },
  approved: { label: "Aprobada", variant: "success" },
  rejected: { label: "Rechazada", variant: "danger" },
};

export const REASON_LABELS: Record<RequisitionReason, string> = {
  new_position: "Puesto nuevo",
  backfill: "Reemplazo",
};

import type { Requisition } from "@/db/schema";

/** Etiquetas de solicitudes, compartidas por la bandeja y el detalle. */

export const REQUISITION_STATUS_META: Record<
  Requisition["status"],
  { label: string; variant: "warning" | "success" | "danger" }
> = {
  pending: { label: "Pendiente", variant: "warning" },
  approved: { label: "Aprobada", variant: "success" },
  rejected: { label: "Rechazada", variant: "danger" },
};

export const REQUISITION_REASON_LABELS: Record<Requisition["reason"], string> = {
  new_position: "Puesto nuevo",
  backfill: "Reemplazo",
};

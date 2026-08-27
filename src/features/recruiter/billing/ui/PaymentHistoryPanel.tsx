import type { SubscriptionPayment } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { SettingsSection } from "@/features/recruiter/settings/ui/SettingsSection";

const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" });

function money(amount: string | null, currency: string | null): string {
  if (amount == null) return "—";
  const value = Number(amount).toFixed(2).replace(".", ",");
  return `${currency ?? "USD"} ${value}`;
}

function statusBadge(status: string | null): { label: string; variant: "success" | "danger" | "muted" } {
  const s = (status ?? "").toLowerCase();
  if (s === "paid" || s === "approved" || s === "completed") return { label: "Pagado", variant: "success" };
  if (s === "rejected" || s === "failed" || s === "cancelled") return { label: "Rechazado", variant: "danger" };
  return { label: status ?? "Pendiente", variant: "muted" };
}

/** Historial de cobros de dLocal Go. La página no lo monta si la lista viene vacía. */
export function PaymentHistoryPanel({ payments }: { payments: SubscriptionPayment[] }) {
  return (
    <SettingsSection title="Historial de cobros">
      <ul className="divide-y divide-border text-sm">
        {payments.map((p) => {
          const badge = statusBadge(p.status);
          return (
            <li key={p.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <span className="text-muted">
                {p.paidAt ? dateFmt.format(p.paidAt) : "—"}
              </span>
              <span className="ml-auto font-semibold text-text tabular-nums">
                {money(p.amount, p.currency)}
              </span>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </li>
          );
        })}
      </ul>
    </SettingsSection>
  );
}

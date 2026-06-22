import { Card } from "@/components/ui/card";
import type { DashboardKpis } from "../domain/obtener-kpis";

interface KpiItem {
  label: string;
  value: number;
  hint?: string;
}

function buildItems(k: DashboardKpis): KpiItem[] {
  return [
    {
      label: "Búsquedas abiertas",
      value: k.busquedasAbiertas,
      hint: `de ${k.busquedasTotales} en total`,
    },
    { label: "Candidatos en el pool", value: k.candidatosEnPool },
    { label: "Postulaciones activas", value: k.postulacionesActivas },
    { label: "Contrataciones", value: k.contrataciones },
  ];
}

export function KpiGrid({ kpis }: { kpis: DashboardKpis }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {buildItems(kpis).map((item) => (
        <Card key={item.label} variant="kpi">
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {item.label}
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-text">
              {item.value}
            </p>
            {item.hint && <p className="mt-1 text-xs text-muted">{item.hint}</p>}
          </div>
        </Card>
      ))}
    </div>
  );
}

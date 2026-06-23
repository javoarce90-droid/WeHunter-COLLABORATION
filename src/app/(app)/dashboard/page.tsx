import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getActiveMembership } from "@/lib/auth/session";
import { obtenerKpis } from "@/features/recruiter/dashboard/domain/obtener-kpis";
import { getDashboardCounts } from "@/features/recruiter/dashboard/data/dashboard.queries";
import { KpiGrid, KpiGridSkeleton } from "@/features/recruiter/dashboard/ui/KpiGrid";

/**
 * Dashboard del reclutador: KPIs de su workspace (Slice 1).
 *
 * El shell (título + descripción) se renderiza al instante (TTFB). Los KPIs, que dependen
 * de la base, se streamean dentro de <Suspense> con un skeleton: la página no espera a la
 * query más lenta para pintar. Ver database.md regla #7 y frontend-performance.
 */
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Dashboard</h1>
        <p className="text-sm text-muted">Resumen de tu workspace.</p>
      </div>

      <Suspense fallback={<KpiGridSkeleton />}>
        <KpiSection />
      </Suspense>
    </div>
  );
}

/** Parte dinámica: pega a la base. Aislada en su propio componente para poder streamearla. */
async function KpiSection() {
  const membership = await getActiveMembership();
  const result = await obtenerKpis(
    { organizationId: membership?.organizationId ?? null },
    { getCounts: getDashboardCounts },
  );

  if (!result.ok) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-danger">{result.error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <KpiGrid kpis={result.data} />
      <p className="text-xs text-muted">
        Las entrevistas próximas se incorporan cuando esté el módulo de
        entrevistas.
      </p>
    </>
  );
}

import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Placeholder del Dashboard (Slice 0). Sirve de destino tras el login y confirma que la
 * fundación auth + tenancy funciona end-to-end. El Dashboard real (KPIs) es el Slice 1.
 */
export default function DashboardPage() {
  return (
    <Card>
      <CardHeader>
        <h1 className="font-display text-lg font-bold text-text">Dashboard</h1>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted">
          Estás dentro. Los KPIs del reclutador llegan en el próximo slice.
        </p>
      </CardContent>
    </Card>
  );
}

import { FilterChip, FilterChipGroup } from "@/components/ui/filter-chip";

export const PERIODS = [
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "90d", label: "90 días" },
  { key: "ytd", label: "Este año" },
  { key: "all", label: "Todo" },
] as const;

export type PeriodKey = (typeof PERIODS)[number]["key"];

/** Conversión de período → fecha de corte (null = sin corte / histórico). */
export function periodSince(period: PeriodKey, now: Date): Date | null {
  const d = new Date(now);
  switch (period) {
    case "7d":
      d.setDate(d.getDate() - 7);
      return d;
    case "30d":
      d.setDate(d.getDate() - 30);
      return d;
    case "90d":
      d.setDate(d.getDate() - 90);
      return d;
    case "ytd":
      return new Date(now.getFullYear(), 0, 1);
    case "all":
      return null;
  }
}

export function isPeriodKey(v: string | undefined): v is PeriodKey {
  return PERIODS.some((p) => p.key === v);
}

/** Filtro de período: navegación por ?period= (segmento barato, prefetcheable). */
export function PeriodFilter({ current }: { current: PeriodKey }) {
  return (
    <FilterChipGroup label="Período del reporte">
      {PERIODS.map((p) => (
        <FilterChip key={p.key} href={`/reports?period=${p.key}`} active={p.key === current}>
          {p.label}
        </FilterChip>
      ))}
    </FilterChipGroup>
  );
}

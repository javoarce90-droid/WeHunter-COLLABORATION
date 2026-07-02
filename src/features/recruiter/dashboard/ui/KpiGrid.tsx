import type { ReactElement } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardKpis } from "../domain/obtener-kpis";

interface KpiItem {
  label: string;
  value: number;
  hint?: string;
  /** Color semántico del accent (DESIGN.md: KPI con accent line en el top). */
  color: string;
  href: string;
  icon: ReactElement;
}

function buildItems(k: DashboardKpis): KpiItem[] {
  return [
    {
      label: "Búsquedas abiertas",
      value: k.busquedasAbiertas,
      hint: `de ${k.busquedasTotales} en total`,
      color: "var(--primary)",
      href: "/jobs?status=open",
      icon: <BriefcaseIcon />,
    },
    {
      label: "Candidatos en el pool",
      value: k.candidatosEnPool,
      color: "#2563EB",
      href: "/candidates",
      icon: <UsersIcon />,
    },
    {
      label: "Postulaciones activas",
      value: k.postulacionesActivas,
      hint: "en proceso",
      color: "var(--warning)",
      href: "/jobs",
      icon: <FlowIcon />,
    },
    {
      label: "Contrataciones",
      value: k.contrataciones,
      hint: `de ${k.postulacionesTotales} postulaciones`,
      color: "var(--success)",
      href: "/jobs?status=closed",
      icon: <CheckIcon />,
    },
  ];
}

export function KpiGrid({ kpis }: { kpis: DashboardKpis }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {buildItems(kpis).map((item) => (
        <Link key={item.label} href={item.href} className="group outline-none">
          <Card
            variant="kpi"
            className="relative overflow-hidden group-focus-visible:ring-2 group-focus-visible:ring-[var(--focus-ring)]"
          >
            {/* Accent line semántica en el top. */}
            <span
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{ background: item.color }}
              aria-hidden
            />
            <div className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-label">
                  {item.label}
                </p>
                <span
                  className="grid h-7 w-7 place-items-center rounded-lg"
                  style={{
                    color: item.color,
                    background: `color-mix(in oklab, ${item.color} 12%, white)`,
                  }}
                  aria-hidden
                >
                  {item.icon}
                </span>
              </div>
              <p className="mt-2 font-display text-3xl font-bold text-text tabular-nums">
                {item.value}
              </p>
              {item.hint && <p className="mt-1 text-xs text-muted">{item.hint}</p>}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

/** Placeholder mientras los KPIs se streamean (mismo layout, sin saltos). */
export function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} variant="kpi">
          <div className="p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-12" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/* — Íconos (SVG inline, sin dependencias) — */

function BriefcaseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

function FlowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

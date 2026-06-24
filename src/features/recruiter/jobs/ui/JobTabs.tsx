"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Barra de pestañas del workspace de una búsqueda. Client Component porque la pestaña activa
 * depende del pathname. La navegación es por <Link> (prefetch + transición de RSC).
 */

const TABS = [
  { label: "Detalle", segment: "" },
  { label: "Postulados", segment: "postulados" },
  { label: "Pipeline", segment: "pipeline" },
  { label: "Rendimiento", segment: "rendimiento" },
  { label: "Ofertas", segment: "ofertas" },
  { label: "Shortlists", segment: "shortlists" },
  { label: "Editar", segment: "edit" },
] as const;

export function JobTabs({ jobId }: { jobId: string }) {
  const pathname = usePathname();
  const base = `/jobs/${jobId}`;

  return (
    <nav
      aria-label="Secciones de la búsqueda"
      className="-mb-px flex gap-1 overflow-x-auto border-b border-border"
    >
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const active = tab.segment
          ? pathname.startsWith(href)
          : pathname === base;
        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "relative whitespace-nowrap px-3.5 py-2.5 text-sm font-semibold transition-colors",
              active ? "text-primary" : "text-muted hover:text-text",
            ].join(" ")}
          >
            {tab.label}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

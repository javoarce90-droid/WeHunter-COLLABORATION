"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Barra de pestañas de Configuración. Client Component porque la pestaña activa depende del
 * pathname. Calco de JobTabs.tsx (jobs/ui/JobTabs.tsx) para mantener el mismo patrón visual
 * y de navegación en toda la app.
 */

const TABS: { label: string; segment: string }[] = [
  { label: "General", segment: "" },
  { label: "Etapas por defecto", segment: "stages" },
  { label: "Plan y facturación", segment: "plan" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  const base = "/settings";

  return (
    <nav
      aria-label="Secciones de Configuración"
      className="-mb-px flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const active = tab.segment ? pathname.startsWith(href) : pathname === base;
        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "relative whitespace-nowrap rounded-md px-3.5 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
              active ? "text-primary" : "text-muted hover:text-text",
            ].join(" ")}
          >
            {tab.label}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 animate-fade-in rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

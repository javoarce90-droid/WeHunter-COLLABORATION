"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Barra lateral del workspace del reclutador. Identidad visual heredada de la demo
 * (dark navy, logo "Talent platform", activo en tinte púrpura). Colapsable a riel de
 * íconos; la preferencia se guarda en una cookie y la lee el layout en el server, así el
 * estado inicial no parpadea (sin mismatch de hidratación). Client Component porque el
 * activo depende del pathname y el colapso es estado de UI.
 */

const COOKIE_KEY = "wh.sidebar.collapsed";
// 1 año de persistencia.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type IconProps = { className?: string };

const NAV: { href: string; label: string; Icon: (p: IconProps) => React.ReactElement }[] = [
  { href: "/dashboard", label: "Inicio", Icon: DashboardIcon },
  { href: "/jobs", label: "Búsquedas", Icon: BriefcaseIcon },
  { href: "/candidates", label: "Candidatos", Icon: UsersIcon },
  { href: "/clients", label: "Clientes", Icon: BuildingIcon },
  { href: "/agenda", label: "Agenda", Icon: CalendarIcon },
];

export function Sidebar({
  email,
  defaultCollapsed = false,
}: {
  email: string;
  defaultCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${COOKIE_KEY}=${next ? "1" : "0"}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
      return next;
    });
  }

  const initials = email.slice(0, 2).toUpperCase() || "··";

  return (
    <aside
      data-collapsed={collapsed}
      className={[
        "flex h-dvh shrink-0 flex-col bg-sidebar text-white transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-[var(--sidebar-w)]",
      ].join(" ")}
    >
      {/* Logo */}
      <div className="flex h-[var(--topbar-h)] items-center border-b border-white/10 px-3.5">
        <Link
          href="/dashboard"
          aria-label="WeHunter — Inicio"
          className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]"
        >
          {collapsed ? (
            <span className="grid h-9 w-9 shrink-0 place-items-center font-display text-lg font-bold">
              <span className="font-serif italic font-normal text-[#C4B5FD]">W</span>
            </span>
          ) : (
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-display text-[17px] font-bold leading-tight tracking-tight">
                <span className="font-serif italic font-normal text-[#C4B5FD]">We</span>
                Hunter
              </span>
              <span className="text-[10px] font-medium tracking-wide text-white/45">
                Talent platform
              </span>
            </span>
          )}
        </Link>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto p-2.5" aria-label="Navegación principal">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? label : undefined}
              className={[
                "mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                collapsed ? "justify-center" : "",
                active
                  ? "bg-[rgba(var(--primary-rgb),0.22)] text-white"
                  : "text-white/65 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-[18px] w-[18px] shrink-0",
                  active ? "text-primary" : "",
                ].join(" ")}
              />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Usuario + colapsar */}
      <div className="border-t border-white/10 p-2.5">
        <div
          className={[
            "mb-1 flex items-center gap-2.5 rounded-lg px-2 py-1.5",
            collapsed ? "justify-center" : "",
          ].join(" ")}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">
            {initials}
          </span>
          {!collapsed && (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-semibold">{email}</span>
              <span className="text-[11px] text-white/50">Reclutador</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Abrir barra lateral" : "Cerrar barra lateral"}
          title={collapsed ? "Abrir barra lateral" : "Cerrar barra lateral"}
          className={[
            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white",
            collapsed ? "justify-center" : "",
          ].join(" ")}
        >
          <ChevronLeftIcon
            className={[
              "h-[18px] w-[18px] shrink-0 transition-transform duration-200",
              collapsed ? "rotate-180" : "",
            ].join(" ")}
          />
          {!collapsed && <span>Cerrar barra lateral</span>}
        </button>
      </div>
    </aside>
  );
}

/* — Íconos (SVG inline, sin dependencias — CLAUDE.md: no agregar librerías) — */

function DashboardIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function BriefcaseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M2 13h20" />
    </svg>
  );
}

function UsersIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BuildingIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M10 21v-3h4v3" />
    </svg>
  );
}

function CalendarIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

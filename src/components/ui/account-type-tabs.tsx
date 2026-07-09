"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { type: "recruiter", label: "Quiero contratar", login: "/login", register: "/register" },
  { type: "candidate", label: "Busco trabajo", login: "/c/login", register: "/c/register" },
] as const;

/** Selector de tipo de cuenta en login/register: deja bien visible si el flujo es de recruiter o candidato. */
export function AccountTypeTabs() {
  const pathname = usePathname();
  const active = pathname.startsWith("/c/") ? "candidate" : "recruiter";
  const mode = pathname.includes("register") ? "register" : "login";

  return (
    <div className="mb-6 grid grid-cols-2 gap-1 rounded-[var(--radius)] bg-white/10 p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.type}
          href={tab[mode]}
          className={`rounded-[calc(var(--radius)-4px)] px-3 py-2 text-center text-sm font-semibold transition-colors ${
            active === tab.type
              ? "bg-white text-sidebar"
              : "text-white/70 hover:text-white"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

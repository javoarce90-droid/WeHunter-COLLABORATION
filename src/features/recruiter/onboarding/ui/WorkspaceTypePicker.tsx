"use client";

import { Badge } from "@/components/ui/badge";
import type { WorkspaceType } from "../schema";

/** Por ahora solo Freelancer está habilitado para crear workspace (backlog QA ago 2026).
 *  Único lugar donde se define esta lista — CreateOrganizationForm (alta inicial) y
 *  WorkspaceSwitcher (crear un workspace adicional) comparten este componente para que un
 *  cambio acá no pueda volver a quedar aplicado en un solo lugar y no en el otro. */
export const WORKSPACE_USOS: {
  type: WorkspaceType;
  label: string;
  detail: string;
  comingSoon?: boolean;
}[] = [
  {
    type: "freelance",
    label: "Trabajo de forma independiente",
    detail: "Recruiter freelance, con tus propios clientes.",
  },
  {
    type: "team",
    label: "Trabajo en un equipo de Recruiting",
    detail: "Consultora o área de Talent Acquisition.",
    comingSoon: true,
  },
  {
    type: "enterprise",
    label: "Represento a una empresa",
    detail: "Contratación interna, con hiring managers involucrados.",
    comingSoon: true,
  },
];

export function WorkspaceTypePicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: WorkspaceType | null;
  onChange: (type: WorkspaceType) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-col gap-2">
      {WORKSPACE_USOS.map((o) => {
        const active = value === o.type;
        return (
          <button
            key={o.type}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.comingSoon}
            onClick={() => onChange(o.type)}
            className={[
              "rounded-[var(--radius)] border px-4 py-3 text-left outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
              o.comingSoon
                ? "cursor-not-allowed border-border bg-bg opacity-60"
                : active
                  ? "border-primary bg-primary-light"
                  : "border-border bg-surface hover:border-primary/40",
            ].join(" ")}
          >
            <span className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${active ? "text-primary-hover" : "text-text"}`}>
                {o.label}
              </span>
              {o.comingSoon && <Badge variant="muted">Próximamente</Badge>}
              {o.type === "freelance" && (
                <span className="text-xs font-semibold">
                  <span className="text-muted line-through">$59.999</span>{" "}
                  <span className="text-success">$49.999</span>
                </span>
              )}
            </span>
            <span className="mt-1 block text-xs text-muted">{o.detail}</span>
          </button>
        );
      })}
    </div>
  );
}

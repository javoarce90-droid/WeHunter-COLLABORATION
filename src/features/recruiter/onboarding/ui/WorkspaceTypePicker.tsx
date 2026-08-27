"use client";

import { Badge } from "@/components/ui/badge";
import type { WorkspaceType } from "../schema";

/** Enterprise todavía no es autogestionado (es contacto comercial). Freelancer y Teams sí.
 *  Único lugar donde se define esta lista. */
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
    detail: "Consultora o área de Talent Acquisition, hasta 5 personas.",
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
  prices = {},
}: {
  value: WorkspaceType | null;
  onChange: (type: WorkspaceType) => void;
  ariaLabel: string;
  /** Etiqueta de precio por tipo de workspace (tabla `plans`). Ej: { freelance: "USD 29,99" }. */
  prices?: Partial<Record<WorkspaceType, string>>;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-col gap-2">
      {WORKSPACE_USOS.map((o) => {
        const active = value === o.type;
        const price = prices[o.type];
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
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={`text-sm font-semibold ${active ? "text-primary-hover" : "text-text"}`}>
                {o.label}
              </span>
              {o.comingSoon && <Badge variant="muted">Próximamente</Badge>}
              {!o.comingSoon && price ? (
                <span className="text-xs font-semibold text-text">
                  {price}
                  <span className="font-medium text-muted">/mes · 14 días gratis</span>
                </span>
              ) : null}
            </span>
            <span className="mt-1 block text-xs text-muted">{o.detail}</span>
          </button>
        );
      })}
    </div>
  );
}

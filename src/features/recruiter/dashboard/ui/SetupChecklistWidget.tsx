"use client";

import { Menu } from "@/components/ui/menu";
import { ProgressRing } from "@/components/ui/progress-ring";
import { ChecklistItemRow } from "./ChecklistItemRow";
import type { ProgresoSetup } from "../domain/calcular-progreso-setup";

const SIZE = 52;

/**
 * Badge circular fijo (abajo a la derecha) con el % de setup, persistente en toda la app hasta
 * llegar a 100% (ver SetupChecklistWidgetLoader — deja de renderizarse una vez completo). Click
 * abre un popover con el detalle, sin navegar.
 */
export function SetupChecklistWidget({ progreso }: { progreso: ProgresoSetup }) {
  return (
    <div className="fixed bottom-5 right-5 z-[var(--z-sticky)]">
      <Menu
        align="end"
        className="w-[320px] p-0"
        trigger={
          <button
            type="button"
            aria-label={`Configurá tu cuenta: ${progreso.done} de ${progreso.total} listo, ${progreso.percent}% completo`}
            className="relative grid place-items-center rounded-full bg-surface shadow-[var(--shadow-overlay)] outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            style={{ width: SIZE, height: SIZE }}
          >
            <ProgressRing percent={progreso.percent} size={SIZE} />
            <span className="absolute text-[11px] font-bold tabular-nums text-text">
              {progreso.percent}%
            </span>
          </button>
        }
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-bold text-text">Configurá tu cuenta</span>
          <span className="text-xs font-semibold text-muted">
            {progreso.done}/{progreso.total} listo
          </span>
        </div>
        <div className="flex flex-col gap-1 p-1">
          {progreso.items.map((item) => (
            <ChecklistItemRow key={item.title} item={item} />
          ))}
        </div>
      </Menu>
    </div>
  );
}

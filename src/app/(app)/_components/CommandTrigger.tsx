"use client";

import { useSyncExternalStore } from "react";
import { openCommandPalette } from "@/components/ui/command-palette";
import { Kbd } from "@/components/ui/kbd";

// Lectura client-only del SO sin mismatch de hidratación: server y primer render cliente
// devuelven `false`; tras montar, el snapshot del cliente reporta el valor real.
const subscribe = () => () => {};
const getClientIsMac = () =>
  /mac/i.test(navigator.userAgent) || /mac/i.test(navigator.platform);
const getServerIsMac = () => false;

/**
 * Disparador visible de la command palette en la topbar. Recognition rather than recall:
 * el atajo ⌘K deja de ser invisible. Muestra ⌘ en Mac y Ctrl en el resto.
 */
export function CommandTrigger() {
  const isMac = useSyncExternalStore(subscribe, getClientIsMac, getServerIsMac);

  return (
    <button
      type="button"
      onClick={openCommandPalette}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary/40 hover:text-text"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <span className="hidden sm:inline">Buscar</span>
      <Kbd className="hidden sm:inline-flex">{isMac ? "⌘" : "Ctrl"} K</Kbd>
    </button>
  );
}

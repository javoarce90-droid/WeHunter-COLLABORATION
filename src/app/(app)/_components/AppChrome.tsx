"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/lib/toast";
import { CommandPalette } from "@/components/ui/command-palette";

/**
 * Chrome client del shell: provee toasts a todo el árbol y monta la command palette (⌘K).
 * Va dentro del layout server para que las pantallas (server) sigan renderizando en server
 * y solo este envoltorio fino sea cliente.
 */
export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CommandPalette />
      {children}
    </ToastProvider>
  );
}

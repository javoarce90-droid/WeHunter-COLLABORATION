"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/lib/toast";
import { CommandPalette } from "@/components/ui/command-palette";
import type { OrgRole, WorkspaceType } from "@/lib/auth/session";

/**
 * Chrome client del shell: provee toasts a todo el árbol y monta la command palette (⌘K).
 * Va dentro del layout server para que las pantallas (server) sigan renderizando en server
 * y solo este envoltorio fino sea cliente.
 */
export function AppChrome({
  role,
  workspaceType,
  children,
}: {
  role: OrgRole;
  workspaceType: WorkspaceType | null;
  children: ReactNode;
}) {
  return (
    <ToastProvider>
      <CommandPalette role={role} workspaceType={workspaceType} />
      {children}
    </ToastProvider>
  );
}

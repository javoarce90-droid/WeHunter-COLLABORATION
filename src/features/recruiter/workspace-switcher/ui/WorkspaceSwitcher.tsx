"use client";

import { useActionState, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { ROLE_BADGE, ROLE_LABELS } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import {
  cambiarWorkspaceActivoAction,
  crearWorkspaceAdicionalAction,
  type CrearWorkspaceAdicionalState,
} from "../actions";

export interface WorkspaceOption {
  organizationId: string;
  organizationName: string;
  role: OrgRole;
}

/** Selector de workspace: pie del Sidebar. Cambia cuál organización del usuario está viendo
 *  y permite crear una nueva (se vuelve owner). Reemplaza el email/rol estáticos de antes. */
export function WorkspaceSwitcher({
  email,
  workspaces,
  activeOrganizationId,
  collapsed,
}: {
  email: string;
  workspaces: WorkspaceOption[];
  activeOrganizationId: string;
  collapsed: boolean;
}) {
  const [, start] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const active =
    workspaces.find((w) => w.organizationId === activeOrganizationId) ?? workspaces[0];
  const initials = email.slice(0, 2).toUpperCase() || "··";

  function switchTo(organizationId: string) {
    if (organizationId === activeOrganizationId) return;
    start(() => cambiarWorkspaceActivoAction(organizationId));
  }

  return (
    <>
      <Menu
        align="start"
        trigger={
          <button
            type="button"
            title={collapsed ? active?.organizationName : undefined}
            className={[
              "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/10",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">
              {initials}
            </span>
            {!collapsed && (
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-semibold">
                  {active?.organizationName ?? "Workspace"}
                </span>
                <span className="truncate text-[11px] text-white/50">
                  {active ? ROLE_LABELS[active.role] : ""}
                </span>
              </span>
            )}
            {!collapsed && <ChevronsUpDownIcon className="h-3.5 w-3.5 shrink-0 text-white/40" />}
          </button>
        }
      >
        <MenuLabel>Tus workspaces</MenuLabel>
        {workspaces.map((w) => (
          <MenuItem
            key={w.organizationId}
            onClick={() => switchTo(w.organizationId)}
            icon={w.organizationId === activeOrganizationId ? <CheckIcon /> : undefined}
          >
            <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className="truncate">{w.organizationName}</span>
              <Badge variant={ROLE_BADGE[w.role]}>{ROLE_LABELS[w.role]}</Badge>
            </span>
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem onClick={() => setCreateOpen(true)}>Crear workspace</MenuItem>
      </Menu>

      <CreateWorkspaceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

const initialCreateState: CrearWorkspaceAdicionalState = {};

const USOS: { type: "freelance" | "team" | "enterprise"; label: string; detail: string }[] = [
  {
    type: "freelance",
    label: "Trabajo de forma independiente",
    detail: "Recruiter freelance, con tus propios clientes.",
  },
  {
    type: "team",
    label: "Trabajo en un equipo de Recruiting",
    detail: "Consultora o área de Talent Acquisition.",
  },
  {
    type: "enterprise",
    label: "Represento a una empresa",
    detail: "Contratación interna, con hiring managers involucrados.",
  },
];

function CreateWorkspaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(
    crearWorkspaceAdicionalAction,
    initialCreateState,
  );
  const [uso, setUso] = useState<(typeof USOS)[number]["type"] | null>(null);

  return (
    <Dialog open={open} onClose={onClose} side="center" title="Creá tu nuevo workspace">
      <form action={formAction} className="flex flex-col gap-5">
        <Input
          label="Nombre del workspace"
          name="name"
          type="text"
          placeholder="Ej: Consultora Talento RH"
          required
          autoFocus
        />

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-label">¿Cómo lo vas a usar?</span>
          <input type="hidden" name="workspaceType" value={uso ?? ""} />
          <div role="radiogroup" aria-label="Cómo vas a usar este workspace" className="flex flex-col gap-2">
            {USOS.map((o) => {
              const activeOpt = uso === o.type;
              return (
                <button
                  key={o.type}
                  type="button"
                  role="radio"
                  aria-checked={activeOpt}
                  onClick={() => setUso(o.type)}
                  className={[
                    "rounded-[var(--radius)] border px-3.5 py-2.5 text-left outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                    activeOpt
                      ? "border-primary bg-primary-light"
                      : "border-border bg-surface hover:border-primary/40",
                  ].join(" ")}
                >
                  <span
                    className={`block text-sm font-semibold ${activeOpt ? "text-primary-hover" : "text-text"}`}
                  >
                    {o.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{o.detail}</span>
                </button>
              );
            })}
          </div>
        </div>

        {state.error && <p className="text-xs text-danger">{state.error}</p>}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending || uso === null}>
            {pending ? "Creando…" : "Crear workspace"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8.5 6.5 12 13 4" />
    </svg>
  );
}

function ChevronsUpDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 6 3-3 3 3M5 10l3 3 3-3" />
    </svg>
  );
}

import { ROLE_LABELS } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

export interface WorkspaceOption {
  organizationId: string;
  organizationName: string;
  role: OrgRole;
}

/** Identidad del workspace activo, pie del Sidebar. El producto hoy es solo workspace
 *  freelance (uno por usuario) — multi-workspace (ver otros, cambiar, crear uno adicional)
 *  está parkeado y oculto a propósito, no es un recorte de espacio. Cuando se habilite, esto
 *  vuelve a ser un selector interactivo. */
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
  const active =
    workspaces.find((w) => w.organizationId === activeOrganizationId) ?? workspaces[0];
  const initials = email.slice(0, 2).toUpperCase() || "··";

  return (
    <div
      title={collapsed ? active?.organizationName : undefined}
      className={[
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5",
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
    </div>
  );
}

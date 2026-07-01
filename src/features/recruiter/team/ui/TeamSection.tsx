"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/lib/toast";
import {
  invitarMiembroAction,
  actualizarMiembroAction,
  revocarInvitacionAction,
} from "../actions";
import { ASSIGNABLE_ROLES, type OrgRole } from "../domain/gestionar-equipo";
import type { MemberRow, InvitationRow } from "../data/team.queries";

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  recruiter: "Reclutador",
  consultant: "Consultor",
};
const ROLE_BADGE: Record<OrgRole, "primary" | "blue" | "muted"> = {
  owner: "primary",
  admin: "blue",
  recruiter: "muted",
  consultant: "muted",
};

const fieldClass =
  "rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

export function TeamSection({
  members,
  invitations,
  currentRole,
  currentUserId,
}: {
  members: MemberRow[];
  invitations: InvitationRow[];
  currentRole: OrgRole;
  currentUserId: string;
}) {
  const toast = useToast();
  const [, start] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("recruiter");
  const canManage = currentRole === "owner" || currentRole === "admin";

  function invitar() {
    if (!email.trim()) {
      toast({ message: "Ingresá un email.", variant: "danger" });
      return;
    }
    start(async () => {
      const res = await invitarMiembroAction(email.trim(), role);
      if (!res.ok) toast({ message: res.error ?? "No se pudo invitar.", variant: "danger" });
      else {
        setEmail("");
        toast({ message: `Invitación enviada a ${email.trim()}`, variant: "success" });
      }
    });
  }

  function actualizar(m: MemberRow, patch: { role?: OrgRole; status?: "active" | "inactive" }) {
    start(async () => {
      const res = await actualizarMiembroAction(m.membershipId, patch);
      if (!res.ok) toast({ message: res.error ?? "No se pudo actualizar.", variant: "danger" });
      else toast({ message: `${m.name ?? m.email} actualizado`, variant: "success" });
    });
  }

  function revocar(inv: InvitationRow) {
    start(async () => {
      const res = await revocarInvitacionAction(inv.id);
      if (!res.ok) toast({ message: res.error ?? "No se pudo revocar.", variant: "danger" });
      else toast({ message: "Invitación revocada", variant: "success" });
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Invitar */}
      {canManage && (
        <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius)] border border-border bg-bg p-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Invitar por email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="persona@empresa.com"
              className={`${fieldClass} w-full`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value as OrgRole)} className={fieldClass}>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <Button onClick={invitar}>Invitar</Button>
        </div>
      )}

      {/* Miembros */}
      <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2.5 pl-4 pr-3 text-xs font-semibold uppercase tracking-wide text-muted">Miembro</th>
              <th className="py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-muted">Rol</th>
              <th className="py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-muted">Estado</th>
              <th className="py-2.5 pr-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((m) => {
              const isSelf = m.profileId === currentUserId;
              const editable = canManage && m.role !== "owner" && !isSelf;
              return (
                <tr key={m.membershipId} className="transition-colors hover:bg-bg">
                  <td className="py-2.5 pl-4 pr-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={m.name ?? m.email} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-text">
                          {m.name ?? "—"} {isSelf && <span className="text-xs font-normal text-muted">(vos)</span>}
                        </p>
                        <p className="truncate text-xs text-muted">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge variant={ROLE_BADGE[m.role]}>{ROLE_LABELS[m.role]}</Badge>
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge variant={m.status === "active" ? "success" : "muted"}>
                      {m.status === "active" ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4">
                    {editable && (
                      <div className="flex justify-end">
                        <Menu
                          align="end"
                          trigger={
                            <IconButton aria-label="Acciones del miembro" size="sm" variant="ghost">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                                <circle cx="8" cy="3" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="8" cy="13" r="1.4" />
                              </svg>
                            </IconButton>
                          }
                        >
                          <MenuLabel>Cambiar rol</MenuLabel>
                          {ASSIGNABLE_ROLES.filter((r) => r !== m.role).map((r) => (
                            <MenuItem key={r} onClick={() => actualizar(m, { role: r })}>
                              {ROLE_LABELS[r]}
                            </MenuItem>
                          ))}
                          <MenuSeparator />
                          {m.status === "active" ? (
                            <MenuItem destructive onClick={() => actualizar(m, { status: "inactive" })}>
                              Desactivar
                            </MenuItem>
                          ) : (
                            <MenuItem onClick={() => actualizar(m, { status: "active" })}>Activar</MenuItem>
                          )}
                        </Menu>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Invitaciones pendientes */}
      {invitations.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Invitaciones pendientes
          </h3>
          <ul className="flex flex-col gap-1.5">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border px-3 py-2"
              >
                <span className="truncate text-sm text-text">{inv.email}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={ROLE_BADGE[inv.role]}>{ROLE_LABELS[inv.role]}</Badge>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => revocar(inv)}
                      className="text-xs font-semibold text-muted hover:text-danger"
                    >
                      Revocar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            El envío del email de invitación se conecta más adelante; por ahora quedan registradas.
          </p>
        </div>
      )}
    </div>
  );
}

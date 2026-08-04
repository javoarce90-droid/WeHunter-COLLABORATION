"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SectionCard } from "@/components/ui/section-card";
import { Tooltip } from "@/components/ui/tooltip";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/lib/toast";
import {
  invitarMiembroAction,
  actualizarMiembroAction,
  revocarInvitacionAction,
  reenviarInvitacionAction,
  eliminarMiembroAction,
} from "../actions";
import {
  assignableRolesFor,
  canInviteMore,
  MAX_TEAM_MEMBERS,
  type OrgRole,
  type WorkspaceType,
} from "../domain/gestionar-equipo";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_BADGE } from "@/lib/auth/roles";
import type { MemberRow, InvitationRow } from "../data/team.queries";

export function TeamSection({
  members,
  invitations,
  currentRole,
  currentUserId,
  workspaceType,
}: {
  members: MemberRow[];
  invitations: InvitationRow[];
  currentRole: OrgRole;
  currentUserId: string;
  workspaceType: WorkspaceType | null;
}) {
  const toast = useToast();
  const [, start] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<MemberRow | null>(null);
  const canManage = currentRole === "owner" || currentRole === "admin";
  const assignableRoles = assignableRolesFor(workspaceType);
  const totalMembers = members.length + invitations.length;
  const canInvite = canInviteMore(workspaceType, totalMembers);
  const isFreelance = workspaceType === "freelance";
  const inviteDisabledReason = isFreelance
    ? "Tu plan Freelancer no incluye invitar miembros al equipo."
    : `Llegaste al límite de ${MAX_TEAM_MEMBERS} miembros de tu plan (incluye invitaciones pendientes).`;

  function invitar(data: { name: string; email: string; role: OrgRole }) {
    start(async () => {
      const res = await invitarMiembroAction(data.name, data.email, data.role);
      if (!res.ok) {
        toast({ message: res.error ?? "No se pudo invitar.", variant: "danger" });
      } else {
        setInviteOpen(false);
        toast({ message: `Invitación enviada a ${data.email}`, variant: "success" });
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

  function reenviar(inv: InvitationRow) {
    start(async () => {
      const res = await reenviarInvitacionAction(inv.id);
      if (!res.ok) toast({ message: res.error ?? "No se pudo reenviar.", variant: "danger" });
      else toast({ message: `Invitación reenviada a ${inv.email}`, variant: "success" });
    });
  }

  function eliminar(m: MemberRow) {
    start(async () => {
      const res = await eliminarMiembroAction(m.membershipId);
      setConfirmDelete(null);
      if (!res.ok) toast({ message: res.error ?? "No se pudo eliminar.", variant: "danger" });
      else toast({ message: `Cuenta de ${m.name ?? m.email} eliminada`, variant: "success" });
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {isFreelance && (
        <div className="flex items-center gap-2.5 rounded-[var(--radius)] border border-[#DBEAFE] bg-[#EEF2FF] px-3.5 py-2.5 text-xs text-[#1E40AF]">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          Tu plan Freelancer es de un solo usuario. Para sumar miembros a tu equipo, pasate a un
          plan Team.
        </div>
      )}
      <SectionCard
        title="Miembros"
        flush
        action={
          canManage &&
          (canInvite ? (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              Invitar miembro
            </Button>
          ) : (
            <Tooltip label={inviteDisabledReason}>
              <Button size="sm" disabled>
                Invitar miembro
              </Button>
            </Tooltip>
          ))
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2.5 pl-4 pr-3 text-xs font-semibold uppercase tracking-wide text-label">Miembro</th>
                <th className="py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-label">Rol</th>
                <th className="py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-label">Estado</th>
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
                            {assignableRoles.filter((r) => r !== m.role).map((r) => (
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
                            <MenuSeparator />
                            <MenuItem destructive onClick={() => setConfirmDelete(m)}>
                              Eliminar cuenta
                            </MenuItem>
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
      </SectionCard>

      {invitations.length > 0 && (
        <SectionCard title="Invitaciones pendientes">
          <ul className="flex flex-col gap-1.5">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text">{inv.name ?? inv.email}</p>
                  {inv.name && <p className="truncate text-xs text-muted">{inv.email}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ROLE_BADGE[inv.role]}>{ROLE_LABELS[inv.role]}</Badge>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => reenviar(inv)}
                        className="text-xs font-semibold text-muted hover:text-primary"
                      >
                        Reenviar
                      </button>
                      <button
                        type="button"
                        onClick={() => revocar(inv)}
                        className="text-xs font-semibold text-muted hover:text-danger"
                      >
                        Revocar
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <InviteMemberDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={invitar}
        assignableRoles={assignableRoles}
      />
      <ConfirmDeleteMemberDialog
        member={confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={eliminar}
      />
    </div>
  );
}

function InviteMemberDialog({
  open,
  onClose,
  onSubmit,
  assignableRoles,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; email: string; role: OrgRole }) => void;
  assignableRoles: OrgRole[];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("recruiter");

  function handleClose() {
    setName("");
    setEmail("");
    setRole("recruiter");
    onClose();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onSubmit({ name: name.trim(), email: email.trim(), role });
  }

  return (
    <Dialog open={open} onClose={handleClose} side="center" title="Invitar miembro">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          label="Nombre completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Ana Gómez"
          required
          autoFocus
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="persona@empresa.com"
          required
        />
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted">Rol</span>
            <Tooltip label={ROLE_DESCRIPTIONS[role]} align="start">
              <span
                tabIndex={0}
                aria-label={`Qué puede hacer ${ROLE_LABELS[role]}`}
                className="grid h-3.5 w-3.5 cursor-help place-items-center rounded-full text-[9px] font-bold text-muted ring-1 ring-border"
              >
                ?
              </span>
            </Tooltip>
          </div>
          <Select value={role} onChange={(e) => setRole(e.target.value as OrgRole)}>
            {assignableRoles.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit">Invitar</Button>
        </div>
      </form>
    </Dialog>
  );
}

function ConfirmDeleteMemberDialog({
  member,
  onClose,
  onConfirm,
}: {
  member: MemberRow | null;
  onClose: () => void;
  onConfirm: (m: MemberRow) => void;
}) {
  return (
    <Dialog
      open={member !== null}
      onClose={onClose}
      side="center"
      title={member ? `¿Eliminar la cuenta de ${member.name ?? member.email}?` : ""}
    >
      {member && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text">
            Pierde el acceso al workspace. No se puede deshacer.
          </p>
          <p className="text-sm text-muted">
            Sus notas y actividad quedan en el historial, pero la persona ya no podrá ingresar.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={() => onConfirm(member)}>
              Eliminar cuenta
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

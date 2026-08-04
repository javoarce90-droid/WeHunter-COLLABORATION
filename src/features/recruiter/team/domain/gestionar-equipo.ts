export type { OrgRole, WorkspaceType } from "@/lib/auth/session";
import type { OrgRole, WorkspaceType } from "@/lib/auth/session";
export type MembershipStatus = "active" | "inactive";

/** Roles que se pueden invitar/asignar (el owner es único, no se asigna). Ojo: no todos están
 *  disponibles en todos los workspaces — ver `assignableRolesFor`. */
export const ASSIGNABLE_ROLES: OrgRole[] = [
  "admin",
  "recruiter",
  "sourcer",
  "consultant",
  "hiring_manager",
  "viewer",
];

/** `hiring_manager` solo tiene sentido en workspaces "Represento a una empresa" (Enterprise) —
 *  en Freelance/Team ese rol ni se ofrece. */
export function assignableRolesFor(workspaceType: WorkspaceType | null): OrgRole[] {
  if (workspaceType === "enterprise") return ASSIGNABLE_ROLES;
  return ASSIGNABLE_ROLES.filter((r) => r !== "hiring_manager");
}

export const MAX_TEAM_MEMBERS = 5;

/** Plan Freelancer (workspace "freelance") es de un solo usuario, sin invitaciones. Los demás
 *  (Team/Enterprise, y orgs legado sin workspaceType) comparten el mismo tope de plan Team. */
export function maxMembersFor(workspaceType: WorkspaceType | null): number {
  return workspaceType === "freelance" ? 1 : MAX_TEAM_MEMBERS;
}

/** `currentMemberCount` = miembros activos + invitaciones pendientes (cuentan para el tope,
 *  así no se lo esquiva mandando de más). El owner ya está incluido en ese conteo desde que
 *  se crea la organización. */
export function canInviteMore(
  workspaceType: WorkspaceType | null,
  currentMemberCount: number,
): boolean {
  return currentMemberCount < maxMembersFor(workspaceType);
}

function canManageTeam(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}

// ---- Invitar ----

export type InvitarInput = { name: string; email: string; role: OrgRole; token: string };
export type TeamContext = {
  userId: string;
  organizationId: string;
  role: OrgRole;
  workspaceType: WorkspaceType | null;
};
export type InvitarContext = TeamContext & { currentMemberCount: number };

export type InvitarDeps = {
  createInvitation: (data: {
    name: string;
    email: string;
    role: OrgRole;
    token: string;
  }) => Promise<void>;
};

export async function invitarMiembro(
  input: InvitarInput,
  ctx: InvitarContext,
  deps: InvitarDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!canManageTeam(ctx.role)) {
    return { ok: false, error: "Solo el owner o un admin pueden invitar al equipo." };
  }
  if (!canInviteMore(ctx.workspaceType, ctx.currentMemberCount)) {
    return {
      ok: false,
      error:
        ctx.workspaceType === "freelance"
          ? "Tu plan no incluye invitar miembros al equipo."
          : `Llegaste al límite de ${MAX_TEAM_MEMBERS} miembros de tu plan.`,
    };
  }
  if (input.name.trim().length < 2) {
    return { ok: false, error: "Ingresá el nombre completo de la persona invitada." };
  }
  if (!assignableRolesFor(ctx.workspaceType).includes(input.role)) {
    return { ok: false, error: "Rol inválido para una invitación." };
  }
  await deps.createInvitation({
    name: input.name.trim(),
    email: input.email,
    role: input.role,
    token: input.token,
  });
  return { ok: true };
}

// ---- Actualizar un miembro (rol y/o estado) ----

export type ActualizarInput = {
  membershipId: string;
  role?: OrgRole;
  status?: MembershipStatus;
};

export type ActualizarDeps = {
  getMembership: (
    membershipId: string,
    organizationId: string,
  ) => Promise<{ id: string; role: OrgRole; profileId: string } | null>;
  updateMembership: (
    membershipId: string,
    patch: { role?: OrgRole; status?: MembershipStatus },
  ) => Promise<void>;
};

export async function actualizarMiembro(
  input: ActualizarInput,
  ctx: TeamContext,
  deps: ActualizarDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!canManageTeam(ctx.role)) {
    return { ok: false, error: "Solo el owner o un admin pueden gestionar el equipo." };
  }

  const target = await deps.getMembership(input.membershipId, ctx.organizationId);
  if (!target) {
    return { ok: false, error: "Miembro no encontrado." };
  }
  if (target.role === "owner") {
    return { ok: false, error: "No se puede modificar al owner." };
  }
  if (input.role && !assignableRolesFor(ctx.workspaceType).includes(input.role)) {
    return { ok: false, error: "No se puede asignar ese rol." };
  }
  if (input.status === "inactive" && target.profileId === ctx.userId) {
    return { ok: false, error: "No podés desactivarte a vos mismo." };
  }
  if (input.role === undefined && input.status === undefined) {
    return { ok: false, error: "Nada para actualizar." };
  }

  await deps.updateMembership(input.membershipId, {
    ...(input.role !== undefined && { role: input.role }),
    ...(input.status !== undefined && { status: input.status }),
  });
  return { ok: true };
}

// ---- Eliminar un miembro (a diferencia de desactivar, saca la fila entera) ----

export type EliminarInput = { membershipId: string };

export type EliminarDeps = {
  getMembership: (
    membershipId: string,
    organizationId: string,
  ) => Promise<{ id: string; role: OrgRole; profileId: string } | null>;
  deleteMembership: (membershipId: string, organizationId: string) => Promise<void>;
};

export async function eliminarMiembro(
  input: EliminarInput,
  ctx: TeamContext,
  deps: EliminarDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!canManageTeam(ctx.role)) {
    return { ok: false, error: "Solo el owner o un admin pueden gestionar el equipo." };
  }

  const target = await deps.getMembership(input.membershipId, ctx.organizationId);
  if (!target) {
    return { ok: false, error: "Miembro no encontrado." };
  }
  if (target.role === "owner") {
    return { ok: false, error: "No se puede eliminar al owner." };
  }
  if (target.profileId === ctx.userId) {
    return { ok: false, error: "No podés eliminarte a vos mismo." };
  }

  await deps.deleteMembership(input.membershipId, ctx.organizationId);
  return { ok: true };
}

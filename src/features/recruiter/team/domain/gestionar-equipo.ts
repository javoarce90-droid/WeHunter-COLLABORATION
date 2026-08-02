export type { OrgRole } from "@/lib/auth/session";
import type { OrgRole } from "@/lib/auth/session";
export type MembershipStatus = "active" | "inactive";

/** Roles que se pueden invitar/asignar (el owner es único, no se asigna). */
export const ASSIGNABLE_ROLES: OrgRole[] = [
  "admin",
  "recruiter",
  "sourcer",
  "consultant",
  "hiring_manager",
  "viewer",
];

function canManageTeam(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}

// ---- Invitar ----

export type InvitarInput = { name: string; email: string; role: OrgRole; token: string };
export type TeamContext = { userId: string; organizationId: string; role: OrgRole };

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
  ctx: TeamContext,
  deps: InvitarDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!canManageTeam(ctx.role)) {
    return { ok: false, error: "Solo el owner o un admin pueden invitar al equipo." };
  }
  if (input.name.trim().length < 2) {
    return { ok: false, error: "Ingresá el nombre completo de la persona invitada." };
  }
  if (!ASSIGNABLE_ROLES.includes(input.role)) {
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
  if (input.role && !ASSIGNABLE_ROLES.includes(input.role)) {
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

export type OrgRole = "owner" | "admin" | "recruiter" | "consultant";
export type MembershipStatus = "active" | "inactive";

/** Roles que se pueden invitar/asignar (el owner es único, no se asigna). */
export const ASSIGNABLE_ROLES: OrgRole[] = ["admin", "recruiter", "consultant"];

function canManageTeam(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}

// ---- Invitar ----

export type InvitarInput = { email: string; role: OrgRole; token: string };
export type TeamContext = { userId: string; organizationId: string; role: OrgRole };

export type InvitarDeps = {
  createInvitation: (data: {
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
  if (!ASSIGNABLE_ROLES.includes(input.role)) {
    return { ok: false, error: "Rol inválido para una invitación." };
  }
  await deps.createInvitation({ email: input.email, role: input.role, token: input.token });
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

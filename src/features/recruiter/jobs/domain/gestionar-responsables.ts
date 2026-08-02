import { ok, err, type Result } from "@/lib/result";
import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/**
 * Casos de uso: cambiar el responsable único de una búsqueda, y asignar/sacar su Sourcer
 * opcional — ambos desde el header del detalle. Mismo mecanismo para los dos: validan que
 * el membership destino exista, esté activo, y tenga un rol elegible para ese campo.
 */

/** Responsable único: recruiter interno, consultor externo, u owner/admin llevándola ellos
 *  mismos — mismo criterio que ya usa `crearBusqueda` (auto-asignado a quien la crea). */
export const RESPONSABLE_ROLES: OrgRole[] = ["owner", "admin", "recruiter", "consultant"];

export interface GestionarResponsablesCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

type EligibleMembership = {
  id: string;
  role: OrgRole;
  profileId: string;
  status: "active" | "inactive";
};

export interface GetMembershipDep {
  getMembership(membershipId: string, organizationId: string): Promise<EligibleMembership | null>;
}

// ---- Reasignar responsable ----

export interface ReasignarResponsableInput {
  jobId: string;
  membershipId: string;
}

export interface ReasignarResponsableDeps extends GetMembershipDep {
  updateAssignedTo(jobId: string, organizationId: string, membershipId: string): Promise<void>;
}

export async function reasignarResponsable(
  input: ReasignarResponsableInput,
  ctx: GestionarResponsablesCtx,
  deps: ReasignarResponsableDeps,
): Promise<Result<null>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "jobs.manage")) {
    return err("No tenés permisos para reasignar búsquedas.");
  }

  const membership = await deps.getMembership(input.membershipId, ctx.organizationId);
  if (!membership) {
    return err("Ese miembro no existe en la organización.");
  }
  if (membership.status !== "active") {
    return err("No podés asignar a un miembro inactivo.");
  }
  if (!RESPONSABLE_ROLES.includes(membership.role)) {
    return err("Ese rol no puede ser responsable de una búsqueda.");
  }

  await deps.updateAssignedTo(input.jobId, ctx.organizationId, input.membershipId);
  return ok(null);
}

// ---- Asignar / sacar Sourcer ----

export interface ActualizarSourcerInput {
  jobId: string;
  /** null = sacar el sourcer asignado. */
  membershipId: string | null;
}

export interface ActualizarSourcerDeps extends GetMembershipDep {
  updateSourcer(jobId: string, organizationId: string, membershipId: string | null): Promise<void>;
}

export async function actualizarSourcer(
  input: ActualizarSourcerInput,
  ctx: GestionarResponsablesCtx,
  deps: ActualizarSourcerDeps,
): Promise<Result<null>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "jobs.manage")) {
    return err("No tenés permisos para asignar el Sourcer.");
  }

  if (input.membershipId !== null) {
    const membership = await deps.getMembership(input.membershipId, ctx.organizationId);
    if (!membership) {
      return err("Ese miembro no existe en la organización.");
    }
    if (membership.status !== "active") {
      return err("No podés asignar a un miembro inactivo.");
    }
    if (membership.role !== "sourcer") {
      return err("Ese miembro no tiene el rol Sourcer.");
    }
  }

  await deps.updateSourcer(input.jobId, ctx.organizationId, input.membershipId);
  return ok(null);
}

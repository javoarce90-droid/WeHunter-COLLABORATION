import { ok, err, type Result } from "@/lib/result";
import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/** Caso de uso: crear una empresa cliente. Autorización primaria: rol + organization. */

/** Quién puede ser "responsable" de un cliente elegido a mano en el alta — mismo criterio que
 *  `listAssignableClientOwners`. Un sourcer/consultor/viewer no califica. */
const ROLES_RESPONSABLE: OrgRole[] = ["owner", "admin", "recruiter"];

export interface CrearClienteInput {
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  notes?: string | null;
  /** Elegido a mano en el form de alta (org con más de un candidato posible). null/undefined =
   *  sin elegir, cae al fallback de auto-asignación por org-de-un-solo-miembro. */
  assignedMembershipId?: string | null;
}

export interface CrearClienteCtx {
  userId: string | null;
  organizationId: string | null;
  role: OrgRole | null;
}

export interface CrearClienteDeps {
  insertClient(args: {
    organizationId: string;
    name: string;
    contactName: string | null;
    contactEmail: string | null;
    notes: string | null;
    createdBy: string;
  }): Promise<{ clientId: string }>;
  /** Si la org tiene un solo miembro activo, no hay elección real de recruiter que ofrecer:
   *  se lo asigna directo (Freelance siempre, o un Team recién creado). */
  getSoleActiveMembershipId(organizationId: string): Promise<string | null>;
  assignRecruiterToClient(
    organizationId: string,
    clientId: string,
    membershipId: string,
  ): Promise<void>;
  /** Valida el `assignedMembershipId` elegido a mano: existe, es de esta org, activo. */
  getMembershipById(
    membershipId: string,
    organizationId: string,
  ): Promise<{ id: string; role: OrgRole; status: string } | null>;
  /** El link de compartir se genera siempre al crear el cliente — nunca hace falta un paso
   *  aparte en el detalle solo para tenerlo. */
  generateShareToken(): string;
  createClientShare(args: {
    organizationId: string;
    clientId: string;
    token: string;
    expiresAt: Date | null;
    createdBy: string;
  }): Promise<{ shareId: string; token: string }>;
}

export async function crearCliente(
  input: CrearClienteInput,
  ctx: CrearClienteCtx,
  deps: CrearClienteDeps,
): Promise<Result<{ clientId: string }>> {
  if (!ctx.userId || !ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "clients.manage")) {
    return err("No tenés permisos para gestionar clientes.");
  }

  const name = input.name.trim();
  if (name.length < 2) {
    return err("El nombre del cliente es demasiado corto.");
  }

  const { clientId } = await deps.insertClient({
    organizationId: ctx.organizationId,
    name,
    contactName: input.contactName?.trim() || null,
    contactEmail: input.contactEmail?.trim() || null,
    notes: input.notes?.trim() || null,
    createdBy: ctx.userId,
  });

  if (input.assignedMembershipId) {
    const member = await deps.getMembershipById(input.assignedMembershipId, ctx.organizationId);
    if (member && member.status === "active" && ROLES_RESPONSABLE.includes(member.role)) {
      await deps.assignRecruiterToClient(ctx.organizationId, clientId, member.id);
    }
    // Elegido inválido (rol que no califica, de otra org, inactivo): se ignora en silencio —
    // el cliente ya se creó, un id manipulado no es motivo para fallar el alta completa.
  } else {
    const soleMembershipId = await deps.getSoleActiveMembershipId(ctx.organizationId);
    if (soleMembershipId) {
      await deps.assignRecruiterToClient(ctx.organizationId, clientId, soleMembershipId);
    }
  }

  await deps.createClientShare({
    organizationId: ctx.organizationId,
    clientId,
    token: deps.generateShareToken(),
    expiresAt: null,
    createdBy: ctx.userId,
  });

  return ok({ clientId });
}

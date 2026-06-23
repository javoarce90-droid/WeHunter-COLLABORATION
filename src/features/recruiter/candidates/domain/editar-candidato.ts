import { ok, err, type Result } from "@/lib/result";
import { canManageRecruiting } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/**
 * Caso de uso: editar un candidato del pool (nombre, email y, opcionalmente, reemplazar CV).
 * Si no se adjunta un CV nuevo, el existente se conserva (cvUrl no se toca).
 */

export interface EditarCandidatoInput {
  candidateId: string;
  fullName: string;
  email?: string | null;
}

export interface EditarCandidatoCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

export interface EditarCandidatoDeps {
  /** Presente solo si se adjuntó un CV nuevo (reemplaza al anterior). Post-autorización. */
  uploadCv?: () => Promise<{ path: string }>;
  updateCandidateFields(
    candidateId: string,
    organizationId: string,
    // cvUrl ausente (undefined) = no tocar el CV existente.
    fields: { fullName: string; email: string | null; cvUrl?: string },
  ): Promise<{ updated: boolean }>;
}

export async function editarCandidato(
  input: EditarCandidatoInput,
  ctx: EditarCandidatoCtx,
  deps: EditarCandidatoDeps,
): Promise<Result<{ candidateId: string }>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!canManageRecruiting(ctx.role)) {
    return err("No tenés permisos para editar candidatos.");
  }

  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    return err("El nombre del candidato es demasiado corto.");
  }

  const email = input.email?.trim().toLowerCase() || null;
  const cvUrl = deps.uploadCv ? (await deps.uploadCv()).path : undefined;

  const { updated } = await deps.updateCandidateFields(
    input.candidateId,
    ctx.organizationId,
    { fullName, email, ...(cvUrl !== undefined ? { cvUrl } : {}) },
  );
  if (!updated) {
    return err("El candidato no existe.");
  }

  return ok({ candidateId: input.candidateId });
}

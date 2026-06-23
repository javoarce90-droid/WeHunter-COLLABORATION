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
  /** Path del CV actual (si hay), para borrarlo cuando se reemplaza por uno nuevo. */
  currentCvUrl?: string | null;
}

export interface EditarCandidatoCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

export interface EditarCandidatoDeps {
  /** Presente solo si se adjuntó un CV nuevo (reemplaza al anterior). Post-autorización. */
  uploadCv?: () => Promise<{ path: string }>;
  /** Borra un CV del Storage. Se usa para no dejar huérfano el CV anterior al reemplazar. */
  deleteCv?: (path: string) => Promise<void>;
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

  // Subida del CV nuevo (si se adjuntó). Falla recuperable → err, no crash.
  let newCvUrl: string | undefined;
  if (deps.uploadCv) {
    try {
      newCvUrl = (await deps.uploadCv()).path;
    } catch {
      return err("No se pudo subir el CV. Revisá el archivo e intentá de nuevo.");
    }
  }

  const { updated } = await deps.updateCandidateFields(
    input.candidateId,
    ctx.organizationId,
    { fullName, email, ...(newCvUrl !== undefined ? { cvUrl: newCvUrl } : {}) },
  );
  if (!updated) {
    // El candidato no existe (o es de otra org): si subimos un CV, quedó huérfano → limpiar.
    if (newCvUrl && deps.deleteCv) {
      await deps.deleteCv(newCvUrl).catch(() => {});
    }
    return err("El candidato no existe.");
  }

  // Reemplazo exitoso: borramos el CV anterior para no acumular PII huérfana (best-effort:
  // si el borrado falla, la edición ya quedó hecha y no la revertimos por eso).
  if (
    newCvUrl &&
    input.currentCvUrl &&
    input.currentCvUrl !== newCvUrl &&
    deps.deleteCv
  ) {
    await deps.deleteCv(input.currentCvUrl).catch(() => {});
  }

  return ok({ candidateId: input.candidateId });
}

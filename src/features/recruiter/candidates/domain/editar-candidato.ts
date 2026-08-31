import { ok, err, type Result } from "@/lib/result";
import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import {
  normalizeCandidateDetails,
  type CandidateDetails,
  type CandidateDetailsInput,
} from "./candidate-details";

/**
 * Caso de uso: editar un candidato del pool (nombre, email, campos enriquecidos y,
 * opcionalmente, reemplazar CV). Si no se adjunta un CV nuevo, el existente se conserva.
 */

export interface EditarCandidatoInput extends CandidateDetailsInput {
  candidateId: string;
  fullName: string;
  email?: string | null;
  /** Path del CV actual (si hay), para borrarlo cuando se reemplaza por uno nuevo. */
  currentCvUrl?: string | null;
  /** Path de un CV ya subido a Storage (flujo "Actualizar con IA": el CV se sube al generar
   *  el borrador, antes de este paso). Se usa como `cvUrl` cuando no hay `deps.uploadCv`. */
  existingCvUrl?: string | null;
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
    fields: { fullName: string; email: string | null; cvUrl?: string } & CandidateDetails,
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
  if (!can(ctx.role, "candidates.manage")) {
    return err("No tenés permisos para editar candidatos.");
  }

  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    return err("El nombre del candidato es demasiado corto.");
  }

  const email = input.email?.trim().toLowerCase() || null;

  // CV nuevo. Dos caminos: `uploadCv` = el recruiter adjuntó un archivo ahora (falla
  // recuperable → err); `existingCvUrl` = el CV ya está en Storage (lo subió el flujo con IA
  // al generar el borrador). undefined en ambos = no se toca el CV existente.
  let newCvUrl: string | undefined;
  if (deps.uploadCv) {
    try {
      newCvUrl = (await deps.uploadCv()).path;
    } catch {
      return err("No se pudo subir el CV. Revisá el archivo e intentá de nuevo.");
    }
  } else if (input.existingCvUrl?.trim()) {
    newCvUrl = input.existingCvUrl.trim();
  }

  const { updated } = await deps.updateCandidateFields(
    input.candidateId,
    ctx.organizationId,
    {
      fullName,
      email,
      ...normalizeCandidateDetails(input),
      ...(newCvUrl !== undefined ? { cvUrl: newCvUrl } : {}),
    },
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

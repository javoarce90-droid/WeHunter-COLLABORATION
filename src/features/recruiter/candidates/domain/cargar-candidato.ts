import { ok, err, type Result } from "@/lib/result";
import { canManageRecruiting } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import {
  normalizeCandidateDetails,
  type CandidateDetails,
  type CandidateDetailsInput,
} from "./candidate-details";

/**
 * Caso de uso: cargar un candidato a mano en el pool de la organization.
 * Es el camino "carga manual" del DATA_MODEL: `profile_id` queda null (la persona no es
 * usuario de la app todavía). El otro camino — entrar por postulación — vive en el portal.
 *
 * Autorización primaria: rol + organization. El consultor no carga candidatos.
 */

export interface CargarCandidatoInput extends CandidateDetailsInput {
  fullName: string;
  email?: string | null;
}

export interface CargarCandidatoCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

export interface CargarCandidatoDeps {
  /**
   * Presente SOLO si el reclutador adjuntó un CV. Se ejecuta DESPUÉS de autorizar,
   * para no subir el archivo de quien no tiene permiso. Devuelve el path en Storage.
   */
  uploadCv?: () => Promise<{ path: string }>;
  /** Borra un CV ya subido. Se usa para limpiar el huérfano si el insert falla. */
  deleteCv?: (path: string) => Promise<void>;
  insertCandidate(args: {
    organizationId: string;
    fullName: string;
    email: string | null;
    cvUrl: string | null;
  } & CandidateDetails): Promise<{ candidateId: string }>;
}

export async function cargarCandidato(
  input: CargarCandidatoInput,
  ctx: CargarCandidatoCtx,
  deps: CargarCandidatoDeps,
): Promise<Result<{ candidateId: string }>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!canManageRecruiting(ctx.role)) {
    return err("No tenés permisos para cargar candidatos.");
  }

  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    return err("El nombre del candidato es demasiado corto.");
  }

  const email = input.email?.trim().toLowerCase() || null;

  // El CV se sube recién acá (post-autorización). Una falla de subida es recuperable
  // (archivo, policy, red): devolvemos err para mostrarla en el form, no crasheamos.
  let cvUrl: string | null = null;
  if (deps.uploadCv) {
    try {
      cvUrl = (await deps.uploadCv()).path;
    } catch {
      return err("No se pudo subir el CV. Revisá el archivo e intentá de nuevo.");
    }
  }

  try {
    const { candidateId } = await deps.insertCandidate({
      organizationId: ctx.organizationId,
      fullName,
      email,
      cvUrl,
      ...normalizeCandidateDetails(input),
    });
    return ok({ candidateId });
  } catch (e) {
    // El insert falló después de subir el CV: limpiamos el archivo huérfano y propagamos
    // (un fallo de base es un error de verdad, no control de flujo normal).
    if (cvUrl && deps.deleteCv) {
      await deps.deleteCv(cvUrl).catch(() => {});
    }
    throw e;
  }
}

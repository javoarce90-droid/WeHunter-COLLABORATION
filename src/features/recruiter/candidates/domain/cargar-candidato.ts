import { ok, err, type Result } from "@/lib/result";
import { canManageRecruiting } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/**
 * Caso de uso: cargar un candidato a mano en el pool de la organization.
 * Es el camino "carga manual" del DATA_MODEL: `profile_id` queda null (la persona no es
 * usuario de la app todavía). El otro camino — entrar por postulación — vive en el portal.
 *
 * Autorización primaria: rol + organization. El consultor no carga candidatos.
 */

export interface CargarCandidatoInput {
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
  insertCandidate(args: {
    organizationId: string;
    fullName: string;
    email: string | null;
    cvUrl: string | null;
  }): Promise<{ candidateId: string }>;
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
  // El CV se sube recién acá (post-autorización). Sin CV, cvUrl queda null.
  const cvUrl = deps.uploadCv ? (await deps.uploadCv()).path : null;

  const { candidateId } = await deps.insertCandidate({
    organizationId: ctx.organizationId,
    fullName,
    email,
    cvUrl,
  });

  return ok({ candidateId });
}

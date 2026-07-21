import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import {
  normalizeCandidateDetails,
  type CandidateDetails,
  type CandidateDetailsInput,
} from "./candidate-details";
import type { DuplicateCandidateMatch } from "./duplicate-keys";
import type { LinkableProfile } from "./profile-link";

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
  /** true = el recruiter ya vio el aviso de posible duplicado y confirmó crear igual. */
  confirmDuplicate?: boolean;
  /** true = el recruiter confirmó vincular la cuenta real encontrada por email. */
  linkProfile?: boolean;
  /** true = el recruiter vio que existe una cuenta y decidió NO vincularla, crear igual. */
  skipProfileLink?: boolean;
}

export interface CargarCandidatoCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

export interface CargarCandidatoDeps {
  /** Busca un candidato existente (misma org) con el mismo email o LinkedIn. */
  findDuplicateCandidate(
    organizationId: string,
    args: { email: string | null; linkedinUrl: string | null },
  ): Promise<DuplicateCandidateMatch | null>;
  /** Busca una cuenta real (`profiles`, global) con ese email. */
  findLinkableProfile(email: string | null): Promise<LinkableProfile | null>;
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
    profileId: string | null;
  } & CandidateDetails): Promise<{ candidateId: string }>;
}

export type CargarCandidatoResult =
  | { ok: true; data: { candidateId: string } }
  | {
      ok: false;
      error: string;
      duplicate?: DuplicateCandidateMatch;
      /** true = existe una cuenta real con ese email; el form ofrece vincular o seguir sin. */
      profileMatch?: true;
    };

export async function cargarCandidato(
  input: CargarCandidatoInput,
  ctx: CargarCandidatoCtx,
  deps: CargarCandidatoDeps,
): Promise<CargarCandidatoResult> {
  if (!ctx.organizationId || !ctx.role) {
    return { ok: false, error: "Necesitás estar autenticado en un workspace." };
  }
  if (!can(ctx.role, "candidates.manage")) {
    return { ok: false, error: "No tenés permisos para cargar candidatos." };
  }

  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    return { ok: false, error: "El nombre del candidato es demasiado corto." };
  }

  // `cargarCandidato` es siempre el camino de ALTA (editar candidatos vive en otro caso de
  // uso, con email opcional). Requerido acá porque sin email ni el chequeo de duplicados
  // (parcialmente) ni el de cuenta vinculable (findLinkableProfile) tienen con qué buscar.
  const email = input.email?.trim().toLowerCase() || null;
  if (!email) {
    return { ok: false, error: "El email es obligatorio para cargar un candidato." };
  }
  const details = normalizeCandidateDetails(input);

  // Se puede saltear (confirmDuplicate) solo cuando el recruiter ya vio el aviso y
  // confirmó que es una persona distinta — no es una segunda oportunidad para lo mismo.
  if (!input.confirmDuplicate) {
    const duplicate = await deps.findDuplicateCandidate(ctx.organizationId, {
      email,
      linkedinUrl: details.linkedinUrl,
    });
    if (duplicate) {
      return {
        ok: false,
        error: `Ya existe un candidato con ese ${duplicate.matchedBy === "email" ? "email" : "LinkedIn"}: ${duplicate.fullName}.`,
        duplicate,
      };
    }
  }

  // Cuenta real vinculable (profiles, global — nunca cruza datos entre organizations, ver
  // database.md). Se re-consulta siempre por email server-side: nunca se confía en un
  // profileId que venga del cliente (evita vincular a una cuenta arbitraria).
  let linked: LinkableProfile | null = null;
  if (input.linkProfile) {
    linked = await deps.findLinkableProfile(email);
  } else if (!input.skipProfileLink) {
    const match = await deps.findLinkableProfile(email);
    if (match) {
      return {
        ok: false,
        error: "Ya existe una cuenta de WeHunter con este email.",
        profileMatch: true,
      };
    }
  }

  // El CV se sube recién acá (post-autorización). Una falla de subida es recuperable
  // (archivo, policy, red): devolvemos err para mostrarla en el form, no crasheamos.
  let cvUrl: string | null = null;
  if (deps.uploadCv) {
    try {
      cvUrl = (await deps.uploadCv()).path;
    } catch {
      return { ok: false, error: "No se pudo subir el CV. Revisá el archivo e intentá de nuevo." };
    }
  }

  try {
    const { candidateId } = await deps.insertCandidate({
      organizationId: ctx.organizationId,
      fullName,
      email,
      cvUrl: cvUrl ?? linked?.cvUrl ?? null,
      profileId: linked?.profileId ?? null,
      ...details,
      summary: linked?.bio ?? details.summary,
      skills: linked?.skills ?? details.skills,
    });
    return { ok: true, data: { candidateId } };
  } catch (e) {
    // El insert falló después de subir el CV: limpiamos el archivo huérfano y propagamos
    // (un fallo de base es un error de verdad, no control de flujo normal).
    if (cvUrl && deps.deleteCv) {
      await deps.deleteCv(cvUrl).catch(() => {});
    }
    throw e;
  }
}

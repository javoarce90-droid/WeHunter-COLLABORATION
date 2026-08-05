import { ok, err, type Result } from "@/lib/result";
import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

export const TAG_MAX_LENGTH = 40;

/**
 * Caso de uso: etiquetar un candidato (ej. "Top perfil", "Bilingüe"). Las etiquetas se
 * comparten dentro de la org y se reusan por nombre (case-insensitive) — busca-o-crea en
 * vez de duplicar, e insertar el vínculo es idempotente (no falla si ya estaba etiquetado).
 */

export interface AgregarEtiquetaInput {
  candidateId: string;
  tagName: string;
}

export interface AgregarEtiquetaCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

export interface AgregarEtiquetaDeps {
  getCandidateById(
    candidateId: string,
    organizationId: string,
  ): Promise<{ id: string } | null>;
  findTagByName(
    organizationId: string,
    name: string,
  ): Promise<{ id: string; name: string } | null>;
  insertTag(organizationId: string, name: string): Promise<{ id: string; name: string }>;
  linkCandidateTag(args: {
    organizationId: string;
    candidateId: string;
    tagId: string;
  }): Promise<void>;
}

export async function agregarEtiqueta(
  input: AgregarEtiquetaInput,
  ctx: AgregarEtiquetaCtx,
  deps: AgregarEtiquetaDeps,
): Promise<Result<{ tagId: string; name: string }>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "candidates.manage")) {
    return err("No tenés permisos para etiquetar candidatos.");
  }

  const name = input.tagName.trim();
  if (name.length === 0) {
    return err("La etiqueta no puede estar vacía.");
  }
  if (name.length > TAG_MAX_LENGTH) {
    return err(`La etiqueta no puede superar los ${TAG_MAX_LENGTH} caracteres.`);
  }

  const candidate = await deps.getCandidateById(input.candidateId, ctx.organizationId);
  if (!candidate) {
    return err("Candidato no encontrado.");
  }

  const existing = await deps.findTagByName(ctx.organizationId, name);
  const tag = existing ?? (await deps.insertTag(ctx.organizationId, name));

  await deps.linkCandidateTag({
    organizationId: ctx.organizationId,
    candidateId: input.candidateId,
    tagId: tag.id,
  });

  return ok({ tagId: tag.id, name: tag.name });
}

import { ok, err, type Result } from "@/lib/result";
import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/** Caso de uso: sacarle una etiqueta a un candidato (no borra el tag del catálogo de la
 * org, solo el vínculo — otros candidatos pueden seguir teniéndolo). */

export interface QuitarEtiquetaInput {
  candidateId: string;
  tagId: string;
}

export interface QuitarEtiquetaCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

export interface QuitarEtiquetaDeps {
  getCandidateById(
    candidateId: string,
    organizationId: string,
  ): Promise<{ id: string } | null>;
  unlinkCandidateTag(args: {
    organizationId: string;
    candidateId: string;
    tagId: string;
  }): Promise<void>;
}

export async function quitarEtiqueta(
  input: QuitarEtiquetaInput,
  ctx: QuitarEtiquetaCtx,
  deps: QuitarEtiquetaDeps,
): Promise<Result<{ tagId: string }>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "candidates.manage")) {
    return err("No tenés permisos para etiquetar candidatos.");
  }

  const candidate = await deps.getCandidateById(input.candidateId, ctx.organizationId);
  if (!candidate) {
    return err("Candidato no encontrado.");
  }

  await deps.unlinkCandidateTag({
    organizationId: ctx.organizationId,
    candidateId: input.candidateId,
    tagId: input.tagId,
  });

  return ok({ tagId: input.tagId });
}

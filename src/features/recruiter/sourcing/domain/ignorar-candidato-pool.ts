import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import { ok, err, type Result } from "@/lib/result";

/**
 * Ignorar / dejar de ignorar un candidato del pool para una búsqueda puntual (Matchear con IA).
 * "Ignorar" NO saca al candidato del pool ni de otras búsquedas — solo hace que no vuelva a
 * aparecer en el match de ESTA búsqueda (ver `listCandidatesForPoolMatch`). Reversible.
 * Autorización primaria: misma capability que usar el sourcing (`candidates.manage`).
 */

export type IgnorarCandidatoPoolInput = {
  jobId: string;
  candidateId: string;
  /** true = ignorar; false = deshacer. */
  ignorar: boolean;
};

export type IgnorarCandidatoPoolCtx = {
  role: OrgRole | null;
  organizationId: string | null;
  userId: string | null;
};

export type IgnorarCandidatoPoolDeps = {
  jobExists: (jobId: string) => Promise<boolean>;
  ignore: (jobId: string, candidateId: string, ignoredBy: string | null) => Promise<void>;
  unignore: (jobId: string, candidateId: string) => Promise<void>;
};

export async function ignorarCandidatoParaBusqueda(
  input: IgnorarCandidatoPoolInput,
  ctx: IgnorarCandidatoPoolCtx,
  deps: IgnorarCandidatoPoolDeps,
): Promise<Result<{ ignorado: boolean }>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "candidates.manage")) {
    return err("Tu rol no permite ignorar candidatos.");
  }
  if (!(await deps.jobExists(input.jobId))) {
    return err("Búsqueda no encontrada.");
  }

  if (input.ignorar) {
    await deps.ignore(input.jobId, input.candidateId, ctx.userId);
  } else {
    await deps.unignore(input.jobId, input.candidateId);
  }
  return ok({ ignorado: input.ignorar });
}

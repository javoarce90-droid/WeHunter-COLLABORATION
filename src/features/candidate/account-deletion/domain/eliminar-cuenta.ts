import { ok, err, type Result } from "@/lib/result";

/**
 * Caso de uso: derecho de borrado del candidato (obligación legal). Es ANONIMIZACIÓN, no
 * DELETE de `profiles`: se limpia toda la PII pero la fila se mantiene para no romper el
 * histórico de `applications`/`candidates` en las organizaciones donde se postuló. Alcance
 * acotado al perfil global del candidato — nunca toca `candidates` (una fila por org, fuera
 * de este alcance) ni las notas privadas de los recruiters sobre él.
 *
 * Orden de las dependencias importa: primero se lee/borra lo que depende del perfil todavía
 * intacto (CV en Storage), recién al final se borra la cuenta de Auth (después de eso ya no
 * hay sesión válida para seguir operando).
 */

export interface EliminarCuentaCtx {
  userId: string | null;
  accountType: "recruiter" | "candidate" | null;
}

export interface EliminarCuentaDeps {
  getCvPath: (profileId: string) => Promise<string | null>;
  deleteCvFile: (path: string) => Promise<void>;
  deleteResumeData: (profileId: string) => Promise<void>;
  anonymizeProfile: (profileId: string) => Promise<void>;
  deleteAuthUser: (userId: string) => Promise<void>;
}

export async function eliminarCuenta(
  ctx: EliminarCuentaCtx,
  deps: EliminarCuentaDeps,
): Promise<Result<{ userId: string }>> {
  if (!ctx.userId) {
    return err("Necesitás estar autenticado.");
  }
  if (ctx.accountType !== "candidate") {
    return err("Esta acción es solo para cuentas de candidato.");
  }

  const cvPath = await deps.getCvPath(ctx.userId);
  if (cvPath) {
    // Best-effort: un CV huérfano en Storage no debe impedir el resto del borrado legal.
    await deps.deleteCvFile(cvPath).catch(() => {});
  }

  await deps.deleteResumeData(ctx.userId);
  await deps.anonymizeProfile(ctx.userId);
  await deps.deleteAuthUser(ctx.userId);

  return ok({ userId: ctx.userId });
}

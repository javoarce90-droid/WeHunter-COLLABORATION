import type { InboxApplicationRow } from "./pasar-al-pipeline";
import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

// ---- Tipos del caso de uso ----

export type QuitarDeTalentPoolInput = {
  applicationId: string;
};

export type QuitarDeTalentPoolContext = {
  organizationId: string;
  role: OrgRole;
};

export type QuitarDeTalentPoolDeps = {
  getApplicationById: (
    applicationId: string,
    organizationId: string,
  ) => Promise<InboxApplicationRow | null>;
  getCandidateSavedToPool: (
    candidateId: string,
    organizationId: string,
  ) => Promise<boolean | null>;
  setSavedToPool: (candidateId: string, value: boolean) => Promise<void>;
};

// ---- Caso de uso ----

/**
 * Inverso exacto de `guardarEnTalentPool`: saca al candidato del pool de talento del recruiter.
 * Es el "Deshacer" del guardado — se ofrece en el toast justo después de guardar, para el
 * misclic. No toca la postulación (igual que guardar). La nota que se haya dejado al guardar
 * queda: es un registro histórico del equipo, no revierte el sentido de la acción.
 *
 * No-op con error si el candidato NO está en el pool: no hay nada que deshacer.
 */
export async function quitarDeTalentPool(
  input: QuitarDeTalentPoolInput,
  ctx: QuitarDeTalentPoolContext,
  deps: QuitarDeTalentPoolDeps,
): Promise<
  { ok: true; data: { candidateId: string } } | { ok: false; error: string }
> {
  if (!can(ctx.role, "pipeline.move")) {
    return { ok: false, error: "Tu rol no permite gestionar el pool." };
  }

  const application = await deps.getApplicationById(
    input.applicationId,
    ctx.organizationId,
  );
  if (!application) {
    return { ok: false, error: "Postulación no encontrada." };
  }

  const savedToPool = await deps.getCandidateSavedToPool(
    application.candidateId,
    ctx.organizationId,
  );
  if (savedToPool == null) {
    return { ok: false, error: "Candidato no encontrado." };
  }
  if (!savedToPool) {
    return { ok: false, error: "El candidato no está en tu pool de candidatos." };
  }

  await deps.setSavedToPool(application.candidateId, false);
  return { ok: true, data: { candidateId: application.candidateId } };
}

import type { InboxApplicationRow } from "./pasar-al-pipeline";
import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

// ---- Tipos del caso de uso ----

export type GuardarEnTalentPoolInput = {
  applicationId: string;
  /** Nota interna opcional sobre por qué se guarda. Queda como nota real del timeline de
   *  esta postulación, visible en la ficha del candidato — no es un motivo de descarte. */
  note?: string;
};

export type GuardarEnTalentPoolContext = {
  /** profileId real de quien ejecuta la acción — autoría de la nota, si se manda una. */
  userId: string;
  organizationId: string;
  role: OrgRole;
};

export type GuardarEnTalentPoolDeps = {
  getApplicationById: (
    applicationId: string,
    organizationId: string,
  ) => Promise<InboxApplicationRow | null>;
  getCandidateSavedToPool: (
    candidateId: string,
    organizationId: string,
  ) => Promise<boolean | null>;
  setSavedToPool: (candidateId: string) => Promise<void>;
  insertNote: (args: {
    organizationId: string;
    applicationId: string;
    body: string;
    createdBy: string;
  }) => Promise<{ noteId: string }>;
};

// ---- Caso de uso ----

/**
 * "Guardar en Talent Pool": NO es un estado de la postulación ni de esta búsqueda — es una
 * acción sobre el CANDIDATO. Lo suma al pool de talento del recruiter (reusable entre
 * búsquedas), sin tocar `stage`, `pipelineEnteredAt` ni nada de esta postulación puntual.
 *
 * La mayoría de los candidatos ya están en el pool desde que se cargan (`saved_to_pool`
 * nace en `true` — cargarlo a mano YA es la acción de sumarlo). La única excepción es quien
 * llega solo, sin que el recruiter haya hecho nada (Career Site/portal): nace en `false`
 * hasta que alguien decide guardarlo. Por eso esta acción es un no-op con error si el
 * candidato ya está adentro — no hay nada que "guardar" dos veces.
 */
export async function guardarEnTalentPool(
  input: GuardarEnTalentPoolInput,
  ctx: GuardarEnTalentPoolContext,
  deps: GuardarEnTalentPoolDeps,
): Promise<{ ok: true; data: { candidateId: string } } | { ok: false; error: string }> {
  if (!can(ctx.role, "pipeline.move")) {
    return { ok: false, error: "Tu rol no permite gestionar el pool." };
  }

  const application = await deps.getApplicationById(input.applicationId, ctx.organizationId);
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
  if (savedToPool) {
    return { ok: false, error: "El candidato ya es parte de tu pool de candidatos." };
  }

  await deps.setSavedToPool(application.candidateId);

  const note = input.note?.trim();
  if (note) {
    await deps.insertNote({
      organizationId: ctx.organizationId,
      applicationId: input.applicationId,
      body: note,
      createdBy: ctx.userId,
    });
  }

  return { ok: true, data: { candidateId: application.candidateId } };
}

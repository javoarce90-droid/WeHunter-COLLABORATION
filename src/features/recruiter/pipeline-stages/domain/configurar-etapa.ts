import type { ApplicationStage } from "../../applications/schema";
import type { StageConfigPatch } from "../data/pipeline-stages.mutations";
import { isNonDeactivatable } from "../schema";
import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

export type ConfigurarEtapaInput = {
  stageKey: ApplicationStage;
} & StageConfigPatch;

export type ConfigurarEtapaCtx = {
  organizationId: string;
  role: OrgRole;
};

export type ConfigurarEtapaDeps = {
  upsert: (
    organizationId: string,
    stageKey: ApplicationStage,
    patch: StageConfigPatch,
  ) => Promise<void>;
  countCandidatesInStage: (
    organizationId: string,
    stageKey: ApplicationStage,
  ) => Promise<number>;
};

export async function configurarEtapa(
  input: ConfigurarEtapaInput,
  ctx: ConfigurarEtapaCtx,
  deps: ConfigurarEtapaDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!can(ctx.role, "stages.configure")) {
    return { ok: false, error: "Tu rol no permite configurar el pipeline." };
  }

  if (input.isActive === false && isNonDeactivatable(input.stageKey)) {
    return {
      ok: false,
      error: `La etapa "${input.stageKey}" no se puede desactivar.`,
    };
  }

  // No se puede desactivar (ni ocultar del Kanban) una etapa con candidatos adentro,
  // de ninguna búsqueda de la org — primero hay que moverlos.
  if (input.isActive === false) {
    const n = await deps.countCandidatesInStage(ctx.organizationId, input.stageKey);
    if (n > 0) {
      return {
        ok: false,
        error: `No se puede desactivar: hay ${n} candidato${n === 1 ? "" : "s"} en esta etapa contando todas tus búsquedas (el pipeline es el mismo para toda la organización).`,
      };
    }
  }

  if (input.slaDays !== undefined && input.slaDays !== null && input.slaDays < 1) {
    return { ok: false, error: "El SLA debe ser al menos 1 día." };
  }

  if (input.labelOverride !== undefined && input.labelOverride !== null && input.labelOverride.trim().length === 0) {
    return { ok: false, error: "El nombre de la etapa no puede estar vacío." };
  }

  const { stageKey, ...patch } = input;
  await deps.upsert(ctx.organizationId, stageKey, patch);
  return { ok: true };
}

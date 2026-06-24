import type { ApplicationStage } from "../../applications/schema";
import type { StageConfigPatch } from "../data/pipeline-stages.mutations";
import { isNonDeactivatable } from "../schema";

export type ConfigurarEtapaInput = {
  stageKey: ApplicationStage;
} & StageConfigPatch;

export type ConfigurarEtapaCtx = {
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
};

export type ConfigurarEtapaDeps = {
  upsert: (
    organizationId: string,
    stageKey: ApplicationStage,
    patch: StageConfigPatch,
  ) => Promise<void>;
};

export async function configurarEtapa(
  input: ConfigurarEtapaInput,
  ctx: ConfigurarEtapaCtx,
  deps: ConfigurarEtapaDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden configurar el pipeline." };
  }

  if (input.isActive === false && isNonDeactivatable(input.stageKey)) {
    return {
      ok: false,
      error: `La etapa "${input.stageKey}" no se puede desactivar.`,
    };
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

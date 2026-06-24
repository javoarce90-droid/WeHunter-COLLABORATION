"use server";

import { z } from "zod";
import { getActiveMembership } from "@/lib/auth/session";
import { APPLICATION_STAGES } from "../applications/schema";
import { configurarEtapa } from "./domain/configurar-etapa";
import { upsertPipelineStageConfig } from "./data/pipeline-stages.mutations";

const configurarEtapaSchema = z.object({
  stageKey: z.enum(APPLICATION_STAGES),
  isActive: z.boolean().optional(),
  slaDays: z.number().int().min(1).nullable().optional(),
  labelOverride: z.string().max(60).nullable().optional(),
});

export async function configurarEtapaAction(
  _: unknown,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const raw = {
    stageKey: formData.get("stageKey"),
    isActive:
      formData.get("isActive") !== null
        ? formData.get("isActive") === "true"
        : undefined,
    slaDays:
      formData.get("slaDays") !== null && formData.get("slaDays") !== ""
        ? Number(formData.get("slaDays"))
        : formData.get("slaDays") === ""
        ? null
        : undefined,
    labelOverride: formData.get("labelOverride") ?? undefined,
  };

  const parsed = configurarEtapaSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input inválido." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "Sin sesión activa." };

  return configurarEtapa(
    parsed.data,
    { organizationId: membership.organizationId, role: membership.role },
    { upsert: upsertPipelineStageConfig },
  );
}

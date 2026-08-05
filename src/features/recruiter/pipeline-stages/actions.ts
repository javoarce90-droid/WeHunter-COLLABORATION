"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/session";
import { APPLICATION_STAGES } from "../applications/schema";
import { configurarEtapa } from "./domain/configurar-etapa";
import { upsertPipelineStageConfig } from "./data/pipeline-stages.mutations";
import { countApplicationsInStage } from "../applications/data/applications.queries";

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
    { upsert: upsertPipelineStageConfig, countCandidatesInStage: countApplicationsInStage },
  );
}

// ── Pipeline de una búsqueda ────────────────────────────────────────────────

import {
  agregarEtapa,
  renombrarEtapa,
  eliminarEtapa,
  reordenarEtapas,
  configurarSlaEtapaBusqueda,
} from "./domain/gestionar-etapas-busqueda";
import { listJobStages, getJobStage, countApplicationsInJobStage } from "./data/job-stages.queries";
import {
  insertJobStage,
  renameJobStage,
  deleteJobStage,
  setJobStagePositions,
  setJobStageSla,
} from "./data/job-stages.mutations";

export interface EtapaActionResult {
  ok: boolean;
  error?: string;
}

async function ctxDeSesion() {
  const membership = await getActiveMembership();
  if (!membership) return null;
  return { organizationId: membership.organizationId, role: membership.role };
}

function revalidarBusqueda(jobId: string) {
  revalidatePath(`/jobs/${jobId}/pipeline`);
  revalidatePath(`/jobs/${jobId}/postulados`);
}

export async function agregarEtapaAction(
  jobId: string,
  name: string,
  slaDays?: number | null,
): Promise<EtapaActionResult> {
  const ctx = await ctxDeSesion();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const res = await agregarEtapa({ jobId, name, slaDays }, ctx, {
    listStages: listJobStages,
    insertStage: insertJobStage,
  });
  if (!res.ok) return { ok: false, error: res.error };

  revalidarBusqueda(jobId);
  return { ok: true };
}

export async function renombrarEtapaAction(
  jobId: string,
  stageId: string,
  name: string,
): Promise<EtapaActionResult> {
  const ctx = await ctxDeSesion();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const res = await renombrarEtapa({ stageId, name }, ctx, {
    getStage: getJobStage,
    listStages: listJobStages,
    renameStage: renameJobStage,
  });
  if (!res.ok) return { ok: false, error: res.error };

  revalidarBusqueda(jobId);
  return { ok: true };
}

export async function eliminarEtapaAction(
  jobId: string,
  stageId: string,
): Promise<EtapaActionResult> {
  const ctx = await ctxDeSesion();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const res = await eliminarEtapa({ stageId }, ctx, {
    getStage: getJobStage,
    countApplications: countApplicationsInJobStage,
    deleteStage: deleteJobStage,
  });
  if (!res.ok) return { ok: false, error: res.error };

  revalidarBusqueda(jobId);
  return { ok: true };
}

export async function configurarSlaEtapaBusquedaAction(
  jobId: string,
  stageId: string,
  slaDays: number | null,
): Promise<EtapaActionResult> {
  const ctx = await ctxDeSesion();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const res = await configurarSlaEtapaBusqueda({ stageId, slaDays }, ctx, {
    getStage: getJobStage,
    setSla: setJobStageSla,
  });
  if (!res.ok) return { ok: false, error: res.error };

  revalidarBusqueda(jobId);
  return { ok: true };
}

export async function reordenarEtapasAction(
  jobId: string,
  stageIds: string[],
): Promise<EtapaActionResult> {
  const ctx = await ctxDeSesion();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const res = await reordenarEtapas({ jobId, stageIds }, ctx, {
    listStages: listJobStages,
    setPositions: setJobStagePositions,
  });
  if (!res.ok) return { ok: false, error: res.error };

  revalidarBusqueda(jobId);
  return { ok: true };
}

// ── Plantilla de etapas por defecto (org, semilla de las búsquedas nuevas) ──────

import {
  agregarEtapaPlantilla,
  renombrarEtapaPlantilla,
  eliminarEtapaPlantilla,
  reordenarPlantilla,
  configurarSlaPlantilla,
  generarPlantillaPorDefecto,
} from "./domain/gestionar-plantilla-etapas";
import { listStageTemplates, getStageTemplate } from "./data/job-stage-templates.queries";
import {
  insertStageTemplate,
  renameStageTemplate,
  deleteStageTemplate,
  setStageTemplatePositions,
  setStageTemplateSla,
  replaceStageTemplate,
} from "./data/job-stage-templates.mutations";

function revalidarPlantilla() {
  revalidatePath("/settings/stages");
}

export async function agregarEtapaPlantillaAction(
  name: string,
  slaDays?: number | null,
): Promise<EtapaActionResult> {
  const ctx = await ctxDeSesion();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const res = await agregarEtapaPlantilla({ name, slaDays }, ctx, {
    listStages: listStageTemplates,
    insertStage: insertStageTemplate,
  });
  if (!res.ok) return { ok: false, error: res.error };

  revalidarPlantilla();
  return { ok: true };
}

export async function renombrarEtapaPlantillaAction(
  stageId: string,
  name: string,
): Promise<EtapaActionResult> {
  const ctx = await ctxDeSesion();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const res = await renombrarEtapaPlantilla({ stageId, name }, ctx, {
    getStage: getStageTemplate,
    listStages: listStageTemplates,
    renameStage: renameStageTemplate,
  });
  if (!res.ok) return { ok: false, error: res.error };

  revalidarPlantilla();
  return { ok: true };
}

export async function eliminarEtapaPlantillaAction(stageId: string): Promise<EtapaActionResult> {
  const ctx = await ctxDeSesion();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const res = await eliminarEtapaPlantilla({ stageId }, ctx, {
    getStage: getStageTemplate,
    deleteStage: deleteStageTemplate,
  });
  if (!res.ok) return { ok: false, error: res.error };

  revalidarPlantilla();
  return { ok: true };
}

export async function configurarSlaPlantillaAction(
  stageId: string,
  slaDays: number | null,
): Promise<EtapaActionResult> {
  const ctx = await ctxDeSesion();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const res = await configurarSlaPlantilla({ stageId, slaDays }, ctx, {
    getStage: getStageTemplate,
    setSla: setStageTemplateSla,
  });
  if (!res.ok) return { ok: false, error: res.error };

  revalidarPlantilla();
  return { ok: true };
}

export async function reordenarPlantillaAction(stageIds: string[]): Promise<EtapaActionResult> {
  const ctx = await ctxDeSesion();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const res = await reordenarPlantilla({ stageIds }, ctx, {
    listStages: listStageTemplates,
    setPositions: setStageTemplatePositions,
  });
  if (!res.ok) return { ok: false, error: res.error };

  revalidarPlantilla();
  return { ok: true };
}

export async function generarPlantillaPorDefectoAction(): Promise<EtapaActionResult> {
  const ctx = await ctxDeSesion();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const res = await generarPlantillaPorDefecto(ctx, {
    listStages: listStageTemplates,
    replaceTemplate: replaceStageTemplate,
  });
  if (!res.ok) return { ok: false, error: res.error };

  revalidarPlantilla();
  return { ok: true };
}

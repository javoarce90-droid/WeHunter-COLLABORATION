import { ok, err, type Result } from "@/lib/result";
import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import type { JobStage, StageKind } from "../schema";

/**
 * Casos de uso del pipeline de UNA búsqueda: agregar, renombrar, reordenar y borrar etapas.
 * Los cambios afectan solo a esa búsqueda; el resto conserva el suyo.
 *
 * Reglas que se cuidan acá:
 *  - Las etapas que el sistema necesita para funcionar (bandeja, contratado, descartado) no
 *    se borran: el portal del candidato, las ofertas y el cierre de la búsqueda dependen de
 *    que existan.
 *  - Una etapa con gente adentro no se borra; hay que mover a esa gente primero.
 *  - Las etapas que agrega el recruiter son siempre intermedias (`in_process`): inventar una
 *    segunda etapa "contratado" rompería la semántica de la que ya existe.
 */

export type EtapasCtx = {
  organizationId: string;
  role: OrgRole;
};

const MAX_ETAPAS = 15;
const MAX_NOMBRE = 40;

/** Kinds que tienen que existir siempre: el sistema los consulta por significado. */
const KINDS_IRREMPLAZABLES: StageKind[] = ["inbox", "hired", "rejected"];

export type AgregarEtapaDeps = {
  listStages: (jobId: string, organizationId: string) => Promise<JobStage[]>;
  insertStage: (args: {
    organizationId: string;
    jobId: string;
    name: string;
    position: number;
    slaDays?: number | null;
  }) => Promise<{ id: string }>;
};

export async function agregarEtapa(
  input: { jobId: string; name: string; slaDays?: number | null },
  ctx: EtapasCtx,
  deps: AgregarEtapaDeps,
): Promise<Result<{ stageId: string }>> {
  if (!can(ctx.role, "stages.configure")) {
    return err("Tu rol no permite configurar el pipeline.");
  }

  const name = input.name.trim();
  if (name.length < 2) return err("El nombre de la etapa es demasiado corto.");
  if (name.length > MAX_NOMBRE) return err(`El nombre no puede superar los ${MAX_NOMBRE} caracteres.`);
  if (input.slaDays != null && input.slaDays < 1) {
    return err("El SLA tiene que ser de al menos 1 día.");
  }

  const stages = await deps.listStages(input.jobId, ctx.organizationId);
  if (stages.length === 0) return err("Búsqueda no encontrada.");
  if (stages.length >= MAX_ETAPAS) {
    return err(`No podés tener más de ${MAX_ETAPAS} etapas en una búsqueda.`);
  }
  if (stages.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    return err(`Ya existe una etapa llamada "${name}".`);
  }

  // Entra antes de las etapas de cierre: una etapa nueva es siempre parte del proceso, así
  // que no puede quedar después de Contratado o Descartado.
  const primeraDeCierre = stages.find((s) => s.kind === "offer" || s.kind === "hired" || s.kind === "rejected");
  const position = primeraDeCierre ? primeraDeCierre.position : stages.length;

  const { id } = await deps.insertStage({
    organizationId: ctx.organizationId,
    jobId: input.jobId,
    name,
    position,
    slaDays: input.slaDays ?? null,
  });
  return ok({ stageId: id });
}

export type RenombrarEtapaDeps = {
  getStage: (stageId: string, organizationId: string) => Promise<(JobStage & { jobId: string }) | null>;
  listStages: (jobId: string, organizationId: string) => Promise<JobStage[]>;
  renameStage: (stageId: string, name: string) => Promise<void>;
};

export async function renombrarEtapa(
  input: { stageId: string; name: string },
  ctx: EtapasCtx,
  deps: RenombrarEtapaDeps,
): Promise<Result<void>> {
  if (!can(ctx.role, "stages.configure")) {
    return err("Tu rol no permite configurar el pipeline.");
  }

  const name = input.name.trim();
  if (name.length < 2) return err("El nombre de la etapa es demasiado corto.");
  if (name.length > MAX_NOMBRE) return err(`El nombre no puede superar los ${MAX_NOMBRE} caracteres.`);

  const stage = await deps.getStage(input.stageId, ctx.organizationId);
  if (!stage) return err("Etapa no encontrada.");

  const hermanas = await deps.listStages(stage.jobId, ctx.organizationId);
  if (hermanas.some((s) => s.id !== stage.id && s.name.toLowerCase() === name.toLowerCase())) {
    return err(`Ya existe una etapa llamada "${name}".`);
  }

  await deps.renameStage(input.stageId, name);
  return ok(undefined);
}

export type ConfigurarSlaEtapaBusquedaDeps = {
  getStage: (stageId: string, organizationId: string) => Promise<(JobStage & { jobId: string }) | null>;
  setSla: (stageId: string, slaDays: number | null) => Promise<void>;
};

export async function configurarSlaEtapaBusqueda(
  input: { stageId: string; slaDays: number | null },
  ctx: EtapasCtx,
  deps: ConfigurarSlaEtapaBusquedaDeps,
): Promise<Result<void>> {
  if (!can(ctx.role, "stages.configure")) {
    return err("Tu rol no permite configurar el pipeline.");
  }

  if (input.slaDays !== null && input.slaDays < 1) {
    return err("El SLA tiene que ser de al menos 1 día.");
  }

  const stage = await deps.getStage(input.stageId, ctx.organizationId);
  if (!stage) return err("Etapa no encontrada.");

  await deps.setSla(input.stageId, input.slaDays);
  return ok(undefined);
}

export type EliminarEtapaDeps = {
  getStage: (stageId: string, organizationId: string) => Promise<(JobStage & { jobId: string }) | null>;
  countApplications: (stageId: string) => Promise<number>;
  deleteStage: (stageId: string) => Promise<void>;
};

export async function eliminarEtapa(
  input: { stageId: string },
  ctx: EtapasCtx,
  deps: EliminarEtapaDeps,
): Promise<Result<void>> {
  if (!can(ctx.role, "stages.configure")) {
    return err("Tu rol no permite configurar el pipeline.");
  }

  const stage = await deps.getStage(input.stageId, ctx.organizationId);
  if (!stage) return err("Etapa no encontrada.");

  if (KINDS_IRREMPLAZABLES.includes(stage.kind)) {
    return err(`"${stage.name}" no se puede eliminar: el sistema la necesita.`);
  }

  const ocupada = await deps.countApplications(input.stageId);
  if (ocupada > 0) {
    return err(
      `"${stage.name}" tiene ${ocupada} candidato${ocupada !== 1 ? "s" : ""}. Movelos a otra etapa antes de eliminarla.`,
    );
  }

  await deps.deleteStage(input.stageId);
  return ok(undefined);
}

export type ReordenarEtapasDeps = {
  listStages: (jobId: string, organizationId: string) => Promise<JobStage[]>;
  setPositions: (positions: { stageId: string; position: number }[]) => Promise<void>;
};

export async function reordenarEtapas(
  input: { jobId: string; stageIds: string[] },
  ctx: EtapasCtx,
  deps: ReordenarEtapasDeps,
): Promise<Result<void>> {
  if (!can(ctx.role, "stages.configure")) {
    return err("Tu rol no permite configurar el pipeline.");
  }

  const stages = await deps.listStages(input.jobId, ctx.organizationId);
  if (stages.length === 0) return err("Búsqueda no encontrada.");

  // El orden que llega tiene que ser exactamente las mismas etapas: si falta o sobra una,
  // aplicar posiciones parciales dejaría el tablero inconsistente.
  const actuales = new Set(stages.map((s) => s.id));
  if (input.stageIds.length !== actuales.size || input.stageIds.some((id) => !actuales.has(id))) {
    return err("El orden recibido no coincide con las etapas de la búsqueda.");
  }

  // Mismo criterio que agregarEtapa al insertar: una etapa de cierre (oferta/contratado/
  // descartado) nunca puede tener una etapa en curso después — el drag libre de columnas
  // podría, si no, dejar "Contratado" en el medio del proceso.
  const stageById = new Map(stages.map((s) => [s.id, s]));
  let vioCierre = false;
  for (const id of input.stageIds) {
    const esCierre = ["offer", "hired", "rejected"].includes(stageById.get(id)!.kind);
    if (esCierre) vioCierre = true;
    else if (vioCierre) return err("Las etapas de cierre siempre van al final.");
  }

  await deps.setPositions(input.stageIds.map((stageId, position) => ({ stageId, position })));
  return ok(undefined);
}

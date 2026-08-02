import { ok, err, type Result } from "@/lib/result";
import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import type { JobStage, StageKind } from "../schema";

/**
 * Plantilla de etapas por defecto de la organización: la semilla con la que nace el pipeline
 * de cada búsqueda nueva (equivalente a `gestionar-etapas-busqueda.ts`, pero a nivel org en
 * vez de por job — mismas reglas, mismo idioma).
 *
 * A diferencia de una etapa de búsqueda, una fila de la plantilla nunca tiene candidatos
 * adentro (no hay `applications` que referencien esta tabla) — por eso `eliminarEtapaPlantilla`
 * no necesita el chequeo de ocupación que sí tiene `eliminarEtapa`.
 */

export type PlantillaCtx = {
  organizationId: string;
  role: OrgRole;
};

const MAX_ETAPAS = 15;
const MAX_NOMBRE = 40;

/** Kinds que tienen que existir siempre: el seed de un job nuevo los necesita. */
const KINDS_IRREMPLAZABLES: StageKind[] = ["inbox", "hired", "rejected"];

// ---- Default fijo ----

/** Único set de etapas intermedias con el que nace toda organización — sin presets: el
 *  recruiter siempre puede editarlas después, esto es solo el punto de partida. */
const DEFAULT_MIDDLE_STAGES = [
  { name: "Preseleccionado", slaDays: 3 },
  { name: "Entrevista Recruiter", slaDays: 5 },
  { name: "Entrevista Cliente", slaDays: 4 },
] as const;

export type StageTemplateSeed = { name: string; position: number; slaDays: number | null; kind: StageKind };

/** Arma la plantilla completa (bandeja + intermedias + cierre) desde cero. Usada tanto al
 *  sembrar una organización nueva como al generarla manualmente para una ya existente que
 *  todavía no tiene ninguna fila (creada antes de esta feature). */
export function buildDefaultStageTemplate(): StageTemplateSeed[] {
  const middle = DEFAULT_MIDDLE_STAGES;
  return [
    { name: "Postulados", position: 0, slaDays: null, kind: "inbox" },
    ...middle.map((m, i) => ({ name: m.name, position: i + 1, slaDays: m.slaDays, kind: "in_process" as StageKind })),
    { name: "Oferta", position: middle.length + 1, slaDays: null, kind: "offer" as StageKind },
    { name: "Contratado", position: middle.length + 2, slaDays: null, kind: "hired" as StageKind },
    { name: "Descartado", position: middle.length + 3, slaDays: null, kind: "rejected" as StageKind },
  ];
}

// ---- Agregar ----

export type AgregarEtapaPlantillaDeps = {
  listStages: (organizationId: string) => Promise<JobStage[]>;
  insertStage: (args: { organizationId: string; name: string; position: number }) => Promise<{ id: string }>;
};

export async function agregarEtapaPlantilla(
  input: { name: string },
  ctx: PlantillaCtx,
  deps: AgregarEtapaPlantillaDeps,
): Promise<Result<{ stageId: string }>> {
  if (!can(ctx.role, "stages.configure")) {
    return err("Tu rol no permite configurar el pipeline.");
  }

  const name = input.name.trim();
  if (name.length < 2) return err("El nombre de la etapa es demasiado corto.");
  if (name.length > MAX_NOMBRE) return err(`El nombre no puede superar los ${MAX_NOMBRE} caracteres.`);

  const stages = await deps.listStages(ctx.organizationId);
  if (stages.length >= MAX_ETAPAS) {
    return err(`No podés tener más de ${MAX_ETAPAS} etapas en la plantilla.`);
  }
  if (stages.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    return err(`Ya existe una etapa llamada "${name}".`);
  }

  const primeraDeCierre = stages.find((s) => s.kind === "offer" || s.kind === "hired" || s.kind === "rejected");
  const position = primeraDeCierre ? primeraDeCierre.position : stages.length;

  const { id } = await deps.insertStage({ organizationId: ctx.organizationId, name, position });
  return ok({ stageId: id });
}

// ---- Renombrar ----

export type RenombrarEtapaPlantillaDeps = {
  getStage: (stageId: string, organizationId: string) => Promise<JobStage | null>;
  listStages: (organizationId: string) => Promise<JobStage[]>;
  renameStage: (stageId: string, name: string) => Promise<void>;
};

export async function renombrarEtapaPlantilla(
  input: { stageId: string; name: string },
  ctx: PlantillaCtx,
  deps: RenombrarEtapaPlantillaDeps,
): Promise<Result<void>> {
  if (!can(ctx.role, "stages.configure")) {
    return err("Tu rol no permite configurar el pipeline.");
  }

  const name = input.name.trim();
  if (name.length < 2) return err("El nombre de la etapa es demasiado corto.");
  if (name.length > MAX_NOMBRE) return err(`El nombre no puede superar los ${MAX_NOMBRE} caracteres.`);

  const stage = await deps.getStage(input.stageId, ctx.organizationId);
  if (!stage) return err("Etapa no encontrada.");

  const hermanas = await deps.listStages(ctx.organizationId);
  if (hermanas.some((s) => s.id !== stage.id && s.name.toLowerCase() === name.toLowerCase())) {
    return err(`Ya existe una etapa llamada "${name}".`);
  }

  await deps.renameStage(input.stageId, name);
  return ok(undefined);
}

// ---- SLA ----

export type ConfigurarSlaPlantillaDeps = {
  getStage: (stageId: string, organizationId: string) => Promise<JobStage | null>;
  setSla: (stageId: string, slaDays: number | null) => Promise<void>;
};

export async function configurarSlaPlantilla(
  input: { stageId: string; slaDays: number | null },
  ctx: PlantillaCtx,
  deps: ConfigurarSlaPlantillaDeps,
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

// ---- Eliminar ----

export type EliminarEtapaPlantillaDeps = {
  getStage: (stageId: string, organizationId: string) => Promise<JobStage | null>;
  deleteStage: (stageId: string) => Promise<void>;
};

export async function eliminarEtapaPlantilla(
  input: { stageId: string },
  ctx: PlantillaCtx,
  deps: EliminarEtapaPlantillaDeps,
): Promise<Result<void>> {
  if (!can(ctx.role, "stages.configure")) {
    return err("Tu rol no permite configurar el pipeline.");
  }

  const stage = await deps.getStage(input.stageId, ctx.organizationId);
  if (!stage) return err("Etapa no encontrada.");

  if (KINDS_IRREMPLAZABLES.includes(stage.kind)) {
    return err(`"${stage.name}" no se puede eliminar: toda búsqueda nueva la necesita.`);
  }

  await deps.deleteStage(input.stageId);
  return ok(undefined);
}

// ---- Reordenar ----

export type ReordenarPlantillaDeps = {
  listStages: (organizationId: string) => Promise<JobStage[]>;
  setPositions: (positions: { stageId: string; position: number }[]) => Promise<void>;
};

export async function reordenarPlantilla(
  input: { stageIds: string[] },
  ctx: PlantillaCtx,
  deps: ReordenarPlantillaDeps,
): Promise<Result<void>> {
  if (!can(ctx.role, "stages.configure")) {
    return err("Tu rol no permite configurar el pipeline.");
  }

  const stages = await deps.listStages(ctx.organizationId);
  if (stages.length === 0) return err("Plantilla no encontrada.");

  const actuales = new Set(stages.map((s) => s.id));
  if (input.stageIds.length !== actuales.size || input.stageIds.some((id) => !actuales.has(id))) {
    return err("El orden recibido no coincide con las etapas de la plantilla.");
  }

  await deps.setPositions(input.stageIds.map((stageId, position) => ({ stageId, position })));
  return ok(undefined);
}

// ---- Generar plantilla por defecto ----

export type GenerarPlantillaPorDefectoDeps = {
  listStages: (organizationId: string) => Promise<JobStage[]>;
  replaceTemplate: (organizationId: string, items: StageTemplateSeed[]) => Promise<void>;
};

/** Para organizaciones creadas antes de esta feature, que no tienen ninguna fila todavía
 *  (las nuevas se siembran solas al crear la organización). Solo actúa si está vacía: no es
 *  un reset general, es puntualmente el backfill de las que se quedaron sin plantilla. */
export async function generarPlantillaPorDefecto(
  ctx: PlantillaCtx,
  deps: GenerarPlantillaPorDefectoDeps,
): Promise<Result<void>> {
  if (!can(ctx.role, "stages.configure")) {
    return err("Tu rol no permite configurar el pipeline.");
  }

  const stages = await deps.listStages(ctx.organizationId);
  if (stages.length > 0) {
    return err("Esta organización ya tiene una plantilla de etapas.");
  }

  await deps.replaceTemplate(ctx.organizationId, buildDefaultStageTemplate());
  return ok(undefined);
}
